using FutureOfEgypt.Application.Features.Tracking;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class TrackingService : ITrackingService
    {
        private readonly AppDbContext _context;

        public TrackingService(AppDbContext context)
        {
            _context = context;
        }

public async Task ReceiveLocationUpdateAsync(
    Guid engineerPublicId,
    ReceiveLocationUpdateRequest request,
    CancellationToken cancellationToken = default)
        {
            var engineer = await _context.Engineers
                .FirstOrDefaultAsync(
                    x => x.PublicId == engineerPublicId && !x.IsDeleted,
                    cancellationToken);

            if (engineer is null)
                throw new InvalidOperationException("Engineer does not exist.");

            var device = await _context.Devices
                .FirstOrDefaultAsync(
                    x => x.PublicId == request.DevicePublicId && !x.IsDeleted,
                    cancellationToken);

            if (device is null)
                throw new InvalidOperationException("Device does not exist.");

            var assignmentExists = await _context.EngineerDevices
                .AnyAsync(
                    x => x.EngineerId == engineer.Id
                         && x.DeviceId == device.Id
                         && x.IsActive
                         && !x.IsDeleted,
                    cancellationToken);

            if (!assignmentExists)
                throw new InvalidOperationException("Device is not assigned to this engineer.");

            if (request.Latitude < -90 || request.Latitude > 90)
                throw new InvalidOperationException("Invalid latitude.");

            if (request.Longitude < -180 || request.Longitude > 180)
                throw new InvalidOperationException("Invalid longitude.");

            if (request.RecordedAt > DateTime.UtcNow.AddMinutes(1))
                throw new InvalidOperationException("Recorded time cannot be in the future.");

            var locationHistory = new LocationHistory
            {
                EngineerId = engineer.Id,
                DeviceId = device.Id,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                IsMocked = request.IsMocked,
                RecordedAt = request.RecordedAt,
                ReceivedAt = DateTime.UtcNow
            };

            await _context.LocationHistories.AddAsync(locationHistory, cancellationToken);

            var latestLocation = await _context.DeviceLatestLocations
                .FirstOrDefaultAsync(x => x.DeviceId == device.Id, cancellationToken);

            if (latestLocation is null)
            {
                latestLocation = new DeviceLatestLocation
                {
                    EngineerId = engineer.Id,
                    DeviceId = device.Id,
                    Latitude = request.Latitude,
                    Longitude = request.Longitude,
                    IsMocked = request.IsMocked,
                    RecordedAt = request.RecordedAt,
                    ReceivedAt = DateTime.UtcNow
                };

                await _context.DeviceLatestLocations.AddAsync(latestLocation, cancellationToken);
            }
            else
            {
                latestLocation.EngineerId = engineer.Id;
                latestLocation.Latitude = request.Latitude;
                latestLocation.Longitude = request.Longitude;
                latestLocation.IsMocked = request.IsMocked;
                latestLocation.RecordedAt = request.RecordedAt;
                latestLocation.ReceivedAt = DateTime.UtcNow;
                latestLocation.UpdatedAt = DateTime.UtcNow;
            }

            device.LastSeenAtUtc = DateTime.UtcNow;
            device.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
        }


        public async Task<IReadOnlyList<LatestLocationResponse>> GetLatestLocationsAsync(CancellationToken cancellationToken = default)
        {
            return await _context.DeviceLatestLocations
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.ReceivedAt)
                .Select(x => new LatestLocationResponse
                {
                    EngineerPublicId = x.Engineer!.PublicId,
                    EngineerName = x.Engineer.FullName,

                    DevicePublicId = x.Device!.PublicId,
                    DeviceName = x.Device.DeviceName,

                    Latitude = x.Latitude,
                    Longitude = x.Longitude,
                    IsMocked = x.IsMocked,
                    RecordedAt = x.RecordedAt,
                    ReceivedAt = x.ReceivedAt
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<LocationHistoryResponse>> GetDeviceLocationHistoryAsync(Guid devicePublicId, DateTime? from, DateTime? to, CancellationToken cancellationToken = default)
        {
            var device = await _context.Devices
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.PublicId == devicePublicId && !x.IsDeleted,
                    cancellationToken);

            if (device is null)
                throw new InvalidOperationException("Device does not exist.");

            var query = _context.LocationHistories
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .Where(x => x.DeviceId == device.Id && !x.IsDeleted);

            if (from.HasValue)
            {
                query = query.Where(x => x.RecordedAt >= from.Value);
            }

            if (to.HasValue)
            {
                query = query.Where(x => x.RecordedAt <= to.Value);
            }

            return await query
                .OrderBy(x => x.RecordedAt)
                .Select(x => new LocationHistoryResponse
                {
                    PublicId = x.PublicId,

                    EngineerPublicId = x.Engineer!.PublicId,
                    EngineerName = x.Engineer.FullName,

                    DevicePublicId = x.Device!.PublicId,
                    DeviceName = x.Device.DeviceName,

                    Latitude = x.Latitude,
                    Longitude = x.Longitude,
                    IsMocked = x.IsMocked,
                    RecordedAt = x.RecordedAt,
                    ReceivedAt = x.ReceivedAt
                })
                .ToListAsync(cancellationToken);
        }
    }
}