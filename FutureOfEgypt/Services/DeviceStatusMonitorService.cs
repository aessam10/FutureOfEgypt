using FutureOfEgypt.Application.Common.Helpers;
using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.Tracking;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FutureOfEgypt.Services
{
    public class DeviceStatusMonitorService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DeviceStatusMonitorService> _logger;

        public DeviceStatusMonitorService(
            IServiceScopeFactory scopeFactory,
            ILogger<DeviceStatusMonitorService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckDeviceStatusesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while monitoring device statuses.");
                }

                // Need to resolve options in the loop because it's a singleton service and options might change if using IOptionsMonitor
                // But for simplicity, we resolve it from scope
                using var scope = _scopeFactory.CreateScope();
                var options = scope.ServiceProvider.GetRequiredService<IOptions<LiveStatusOptions>>().Value;
                
                await Task.Delay(TimeSpan.FromSeconds(options.MonitorIntervalSeconds), stoppingToken);
            }
        }

        private async Task CheckDeviceStatusesAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var locationNotifier = scope.ServiceProvider.GetRequiredService<ILocationNotifier>();
            var options = scope.ServiceProvider.GetRequiredService<IOptions<LiveStatusOptions>>().Value;
            var scheduleOptions = scope.ServiceProvider.GetRequiredService<IOptions<TrackingScheduleOptions>>().Value;

            var thresholdTime = DateTime.UtcNow.AddMinutes(-options.StaleAfterMinutes);
            var isWithinWorkingHours = TrackingScheduleHelper.IsWithinWorkingHours(scheduleOptions, DateTime.UtcNow);

            List<DeviceLatestLocation> staleLocations;

            if (!isWithinWorkingHours)
            {
                // Find all online devices because working hours have ended
                staleLocations = await dbContext.DeviceLatestLocations
                    .Include(x => x.Engineer)
                    .Include(x => x.Device)
                    .Where(x => x.IsOnline && !x.IsDeleted)
                    .ToListAsync(cancellationToken);
            }
            else
            {
                // Find devices that are currently marked IsOnline = true but have crossed the threshold
                staleLocations = await dbContext.DeviceLatestLocations
                    .Include(x => x.Engineer)
                    .Include(x => x.Device)
                    .Where(x => x.IsOnline && x.ReceivedAt < thresholdTime && !x.IsDeleted)
                    .ToListAsync(cancellationToken);
            }

            if (!staleLocations.Any())
                return;

            // Mark them as offline
            foreach (var loc in staleLocations)
            {
                loc.IsOnline = false;
                loc.UpdatedAt = DateTime.UtcNow;

                dbContext.EngineerStatusHistories.Add(new EngineerStatusHistory
                {
                    EngineerId = loc.EngineerId,
                    DeviceId = loc.DeviceId,
                    IsOnline = false,
                    Reason = !isWithinWorkingHours ? "Outside working hours" : "Stale connection timeout",
                    ChangedAtUtc = DateTime.UtcNow
                });
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            // Calculate new global counts once
            var totalOnline = await dbContext.DeviceLatestLocations
                .Where(x => !x.IsDeleted && !x.IsHidden && x.IsOnline)
                .CountAsync(cancellationToken);
                
            var totalOffline = await dbContext.DeviceLatestLocations
                .Where(x => !x.IsDeleted && !x.IsHidden && !x.IsOnline)
                .CountAsync(cancellationToken);

            // Broadcast events
            foreach (var loc in staleLocations)
            {
                if (loc.Engineer == null || loc.Device == null) continue;
                
                if (loc.IsHidden) continue; // Do not broadcast hidden devices

                var statusEvent = new EngineerStatusChangedEvent
                {
                    EngineerPublicId = loc.Engineer.PublicId,
                    DevicePublicId = loc.Device.PublicId,
                    IsOnline = false,
                    Reason = !isWithinWorkingHours ? "Outside working hours" : "Stale connection timeout",
                    OnlineCount = totalOnline,
                    OfflineCount = totalOffline
                };

                await locationNotifier.NotifyEngineerStatusChangedAsync(statusEvent, cancellationToken);
            }
        }
    }
}
