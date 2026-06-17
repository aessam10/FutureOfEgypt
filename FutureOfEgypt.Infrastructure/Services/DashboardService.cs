using FutureOfEgypt.Application.Features.Dashboard;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;

        public DashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardSummaryResponse> GetSummaryAsync(
            CancellationToken cancellationToken = default)
        {
            var onlineThresholdUtc = DateTime.UtcNow.AddMinutes(-2);

            var totalEngineers = await _context.Engineers
                .CountAsync(x => !x.IsDeleted, cancellationToken);

            var activeEngineers = await _context.Engineers
                .CountAsync(
                    x => !x.IsDeleted && x.Status == EngineerStatus.Active,
                    cancellationToken);

            var totalDevices = await _context.Devices
                .CountAsync(x => !x.IsDeleted, cancellationToken);

            var activeDevices = await _context.Devices
                .CountAsync(
                    x => !x.IsDeleted && x.Status == DeviceStatus.Active,
                    cancellationToken);

            var activeAssignments = await _context.EngineerDevices
                .CountAsync(
                    x => x.IsActive && !x.IsDeleted,
                    cancellationToken);

            var pendingDeviceAccessRequests = await _context.DeviceAccessRequests
                .CountAsync(
                    x => x.Status == DeviceAccessRequestStatus.Pending && !x.IsDeleted,
                    cancellationToken);
    //        var onlineEngineers = await _context.DeviceLatestLocations
    //.CountAsync(
    //    x => !x.IsDeleted
    //         && x.ReceivedAt >= onlineThresholdUtc
    //         && x.Engineer!.Status == EngineerStatus.Active
    //         && x.Device!.Status == DeviceStatus.Active,
    //    cancellationToken);
            var onlineEngineers = await _context.DeviceLatestLocations
                .Where(x => !x.IsDeleted && x.ReceivedAt >= onlineThresholdUtc)
                .Join(
                    _context.Engineers.Where(e => !e.IsDeleted && e.Status == EngineerStatus.Active),
                    latest => latest.EngineerId,
                    engineer => engineer.Id,
                    (latest, engineer) => latest)
                .Join(
                    _context.Devices.Where(d => !d.IsDeleted && d.Status == DeviceStatus.Active),
                    latest => latest.DeviceId,
                    device => device.Id,
                    (latest, device) => latest)
                .CountAsync(cancellationToken);

            var offlineEngineers = activeAssignments - onlineEngineers;

            if (offlineEngineers < 0)
                offlineEngineers = 0;

            return new DashboardSummaryResponse
            {
                TotalEngineers = totalEngineers,
                ActiveEngineers = activeEngineers,
                TotalDevices = totalDevices,
                ActiveDevices = activeDevices,
                ActiveAssignments = activeAssignments,
                PendingDeviceAccessRequests = pendingDeviceAccessRequests,
                OnlineEngineers = onlineEngineers,
                OfflineEngineers = offlineEngineers
            };
        }

        public async Task<IReadOnlyList<EngineerStatusResponse>> GetEngineersStatusAsync(
            CancellationToken cancellationToken = default)
        {
            var onlineThresholdUtc = DateTime.UtcNow.AddMinutes(-2);

            var engineers = await _context.Engineers
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.FullName)
                .ToListAsync(cancellationToken);

            var activeAssignments = await _context.EngineerDevices
                .AsNoTracking()
                .Include(x => x.Device)
                .Where(x => x.IsActive && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            var latestLocations = await _context.DeviceLatestLocations
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToListAsync(cancellationToken);

            var result = new List<EngineerStatusResponse>();

            foreach (var engineer in engineers)
            {
                var assignment = activeAssignments
                    .FirstOrDefault(x => x.EngineerId == engineer.Id);

                var latestLocation = assignment is null
                    ? null
                    : latestLocations.FirstOrDefault(x => x.DeviceId == assignment.DeviceId);

                var isOnline = latestLocation is not null
                    && latestLocation.ReceivedAt >= onlineThresholdUtc;

                result.Add(new EngineerStatusResponse
                {
                    EngineerPublicId = engineer.PublicId,
                    EngineerName = engineer.FullName,
                    PhoneNumber = engineer.PhoneNumber,
                    Email = engineer.Email,

                    DevicePublicId = assignment?.Device?.PublicId,
                    DeviceName = assignment?.Device?.DeviceName,

                    HasActiveDevice = assignment is not null,
                    IsOnline = isOnline,

                    LastSeenAtUtc = latestLocation?.ReceivedAt,
                    Latitude = latestLocation?.Latitude,
                    Longitude = latestLocation?.Longitude,
                    Accuracy = latestLocation?.Accuracy,
                    Speed = latestLocation?.Speed,
                    IsMocked = latestLocation?.IsMocked
                });
            }

            return result;
        }
    }
}