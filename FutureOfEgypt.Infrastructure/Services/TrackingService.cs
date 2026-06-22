using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.Tracking;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class TrackingService : ITrackingService
    {
        private readonly AppDbContext _context;
        private readonly ILocationNotifier _locationNotifier;
        public TrackingService(AppDbContext context, ILocationNotifier locationNotifier)
        {
            _context = context;
            _locationNotifier = locationNotifier;
        }

        public async Task<DeviceValidationResponse> ValidateDeviceAsync(
            Guid engineerPublicId,
            DeviceValidationRequest request,
            CancellationToken cancellationToken = default)
        {
            // Step 1 — Engineer check.
            // If not found or not active, return EngineerInactive (clean business response, no exception).
            var engineer = await _context.Engineers
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.PublicId == engineerPublicId && !x.IsDeleted,
                    cancellationToken);

            if (engineer is null || engineer.Status != EngineerStatus.Active)
                return new DeviceValidationResponse { Status = DeviceValidationStatus.EngineerInactive };

            // Step 2 — Device lookup by InstallationId only (no SerialNumber fallback).
            var installationId = request.InstallationId?.Trim();

            if (string.IsNullOrWhiteSpace(installationId))
                return new DeviceValidationResponse { Status = DeviceValidationStatus.DeviceNotRegistered };

            var device = await _context.Devices
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.InstallationId == installationId && !x.IsDeleted,
                    cancellationToken);

            if (device is null)
                return new DeviceValidationResponse { Status = DeviceValidationStatus.DeviceNotRegistered };

            // Step 3 — Device status check.
            if (device.Status == DeviceStatus.Blocked)
                return new DeviceValidationResponse { Status = DeviceValidationStatus.DeviceBlocked };

            if (device.Status == DeviceStatus.Inactive)
                return new DeviceValidationResponse { Status = DeviceValidationStatus.DeviceInactive };

            // Step 4 — Active assignment check.
            var activeAssignment = await _context.EngineerDevices
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.DeviceId == device.Id && x.IsActive && !x.IsDeleted,
                    cancellationToken);

            if (activeAssignment is not null)
            {
                if (activeAssignment.EngineerId == engineer.Id)
                    return new DeviceValidationResponse
                    {
                        Status = DeviceValidationStatus.Valid,
                        DevicePublicId = device.PublicId,
                        DeviceName = device.DeviceName
                    };

                // Assigned to a different engineer — regardless of that engineer's active status.
                return new DeviceValidationResponse { Status = DeviceValidationStatus.DeviceAssignedToOther };
            }

            // Step 5 — Prior request check (Pending and Rejected only; Cancelled is intentionally excluded).
            var latestRequest = await _context.DeviceAccessRequests
                .AsNoTracking()
                .Where(x =>
                    x.EngineerId == engineer.Id &&
                    x.InstallationId == installationId &&
                    (x.Status == DeviceAccessRequestStatus.Pending ||
                     x.Status == DeviceAccessRequestStatus.Rejected) &&
                    !x.IsDeleted)
                .OrderByDescending(x => x.RequestedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);

            if (latestRequest is not null)
            {
                if (latestRequest.Status == DeviceAccessRequestStatus.Pending)
                    return new DeviceValidationResponse { Status = DeviceValidationStatus.PendingApproval };

                if (latestRequest.Status == DeviceAccessRequestStatus.Rejected)
                    return new DeviceValidationResponse
                    {
                        Status = DeviceValidationStatus.Rejected,
                        ReviewNote = latestRequest.ReviewNote
                    };
            }

            // No active assignment, no pending/rejected request — engineer can submit a new request.
            return new DeviceValidationResponse { Status = DeviceValidationStatus.DeviceNotAssigned };
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
            if (engineer.Status != EngineerStatus.Active)
                throw new InvalidOperationException("Engineer is not active.");

            var device = await _context.Devices
                .FirstOrDefaultAsync(
                    x => x.PublicId == request.DevicePublicId && !x.IsDeleted,
                    cancellationToken);

            if (device is null)
                throw new InvalidOperationException("Device does not exist.");

            if (!string.IsNullOrWhiteSpace(device.InstallationId))
            {
                if (string.IsNullOrWhiteSpace(request.InstallationId))
                    throw new InvalidOperationException("Installation id is required for this device.");

                if (device.InstallationId != request.InstallationId.Trim())
                    throw new InvalidOperationException("Invalid installation id for this device.");
            }

            if (device.Status != DeviceStatus.Active)
                throw new InvalidOperationException("Device is not active.");

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
            if (request.Accuracy.HasValue && request.Accuracy.Value < 0)
                throw new InvalidOperationException("Invalid accuracy.");

            if (request.Speed.HasValue && request.Speed.Value < 0)
                throw new InvalidOperationException("Invalid speed.");

            device.LastSeenAtUtc = DateTime.UtcNow;
            device.UpdatedAt = DateTime.UtcNow;

            var receivedAtUtc = DateTime.UtcNow;

            var locationHistory = new LocationHistory
            {
                EngineerId = engineer.Id,
                DeviceId = device.Id,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Accuracy = request.Accuracy,
                Speed = request.Speed,
                IsMocked = request.IsMocked,
                RecordedAt = request.RecordedAt,
                ReceivedAt = receivedAtUtc
            };

            await _context.LocationHistories.AddAsync(locationHistory, cancellationToken);

            var latestLocation = await _context.DeviceLatestLocations
                .FirstOrDefaultAsync(
                    x => x.DeviceId == device.Id && !x.IsDeleted,
                    cancellationToken);

            if (latestLocation is null)
            {
                latestLocation = new DeviceLatestLocation
                {
                    EngineerId = engineer.Id,
                    DeviceId = device.Id,
                    Latitude = request.Latitude,
                    Longitude = request.Longitude,
                    Accuracy = request.Accuracy,
                    Speed = request.Speed,
                    IsMocked = request.IsMocked,
                    RecordedAt = request.RecordedAt,
                    ReceivedAt = receivedAtUtc
                };

                await _context.DeviceLatestLocations.AddAsync(latestLocation, cancellationToken);
            }
            else
            {
                latestLocation.EngineerId = engineer.Id;
                latestLocation.DeviceId = device.Id;
                latestLocation.Latitude = request.Latitude;
                latestLocation.Longitude = request.Longitude;
                latestLocation.Accuracy = request.Accuracy;
                latestLocation.Speed = request.Speed;
                latestLocation.IsMocked = request.IsMocked;
                latestLocation.RecordedAt = request.RecordedAt;
                latestLocation.ReceivedAt = receivedAtUtc;
                latestLocation.UpdatedAt = receivedAtUtc;
            }

            device.LastSeenAtUtc = receivedAtUtc;
            device.UpdatedAt = receivedAtUtc;

            await _context.SaveChangesAsync(cancellationToken);

            await _locationNotifier.NotifyLocationReceivedAsync(
                 new LocationNotificationResponse
                 {
                     EngineerPublicId = engineer.PublicId,
                     EngineerName = engineer.FullName,
                     DevicePublicId = device.PublicId,
                     DeviceName = device.DeviceName,
                     Latitude = request.Latitude,
                     Longitude = request.Longitude,
                     Accuracy = request.Accuracy,
                     Speed = request.Speed,
                     IsMocked = request.IsMocked,
                     RecordedAt = request.RecordedAt,
                     ReceivedAt = receivedAtUtc
                 }, cancellationToken);
        }


        public async Task<IReadOnlyList<LatestLocationResponse>> GetLatestLocationsAsync(CancellationToken cancellationToken = default)
        {
            return await _context.DeviceLatestLocations
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .Where(x => !x.IsDeleted && !x.IsHidden)
                .OrderByDescending(x => x.ReceivedAt)
                .Select(x => new LatestLocationResponse
                {
                    EngineerPublicId = x.Engineer!.PublicId,
                    EngineerName = x.Engineer.FullName,

                    DevicePublicId = x.Device!.PublicId,
                    DeviceName = x.Device.DeviceName,

                    Latitude = x.Latitude,
                    Longitude = x.Longitude,
                    Accuracy = x.Accuracy,
                    Speed = x.Speed,
                    IsMocked = x.IsMocked,
                    RecordedAt = x.RecordedAt,
                    ReceivedAt = x.ReceivedAt
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<LatestLocationResponse>> GetHiddenLatestLocationsAsync(CancellationToken cancellationToken = default)
        {
            return await _context.DeviceLatestLocations
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .Where(x => !x.IsDeleted && x.IsHidden)
                .OrderByDescending(x => x.ReceivedAt)
                .Select(x => new LatestLocationResponse
                {
                    EngineerPublicId = x.Engineer!.PublicId,
                    EngineerName = x.Engineer.FullName,

                    DevicePublicId = x.Device!.PublicId,
                    DeviceName = x.Device.DeviceName,

                    Latitude = x.Latitude,
                    Longitude = x.Longitude,
                    Accuracy = x.Accuracy,
                    Speed = x.Speed,
                    IsMocked = x.IsMocked,
                    RecordedAt = x.RecordedAt,
                    ReceivedAt = x.ReceivedAt
                })
                .ToListAsync(cancellationToken);
        }


        public async Task<PagedResponse<LocationHistoryResponse>> GetDeviceLocationHistoryAsync(
    Guid devicePublicId,
    LocationHistoryQueryRequest request,
    CancellationToken cancellationToken = default)
        {
            if (request.FromUtc.HasValue && request.ToUtc.HasValue && request.FromUtc > request.ToUtc)
                throw new InvalidOperationException("FromUtc cannot be greater than ToUtc.");

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

            if (request.FromUtc.HasValue)
            {
                query = query.Where(x => x.RecordedAt >= request.FromUtc.Value);
            }

            if (request.ToUtc.HasValue)
            {
                query = query.Where(x => x.RecordedAt <= request.ToUtc.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

            var items = await query
                .OrderByDescending(x => x.RecordedAt)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(x => new LocationHistoryResponse
                {
                    PublicId = x.PublicId,

                    EngineerPublicId = x.Engineer!.PublicId,
                    EngineerName = x.Engineer.FullName,

                    DevicePublicId = x.Device!.PublicId,
                    DeviceName = x.Device.DeviceName,

                    Latitude = x.Latitude,
                    Longitude = x.Longitude,
                    Accuracy = x.Accuracy,
                    Speed = x.Speed,
                    IsMocked = x.IsMocked,

                    RecordedAt = x.RecordedAt,
                    ReceivedAt = x.ReceivedAt
                })
                .ToListAsync(cancellationToken);

            return new PagedResponse<LocationHistoryResponse>
            {
                Items = items,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }

        public async Task HideLatestLocationAsync(Guid devicePublicId, Guid adminId, CancellationToken cancellationToken = default)
        {
            var device = await _context.Devices
                .FirstOrDefaultAsync(x => x.PublicId == devicePublicId && !x.IsDeleted, cancellationToken);

            if (device is null)
                throw new InvalidOperationException($"Device with public id {devicePublicId} not found.");

            var latestLocation = await _context.DeviceLatestLocations
                .FirstOrDefaultAsync(x => x.DeviceId == device.Id, cancellationToken);

            if (latestLocation is not null && !latestLocation.IsHidden)
            {
                latestLocation.IsHidden = true;
                latestLocation.HiddenAt = DateTime.UtcNow;
                latestLocation.HiddenByUserId = adminId;

                var auditLog = new AuditLog
                {
                    ActionType = AuditActionType.DeviceLocationHidden,
                    PerformedByUserId = adminId,
                    EntityName = "DeviceLatestLocation",
                    EntityPublicId = devicePublicId,
                    Description = $"Admin/Manager hid the current Live Map marker for device {device.DeviceName}."
                };

                await _context.AuditLogs.AddAsync(auditLog, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                await _locationNotifier.NotifyLocationHiddenAsync(devicePublicId, cancellationToken);
            }
        }

        public async Task UnhideLatestLocationAsync(Guid devicePublicId, Guid adminId, CancellationToken cancellationToken = default)
        {
            var device = await _context.Devices
                .FirstOrDefaultAsync(x => x.PublicId == devicePublicId && !x.IsDeleted, cancellationToken);

            if (device is null)
                throw new InvalidOperationException($"Device with public id {devicePublicId} not found.");

            var latestLocation = await _context.DeviceLatestLocations
                .FirstOrDefaultAsync(x => x.DeviceId == device.Id, cancellationToken);

            if (latestLocation is not null && latestLocation.IsHidden)
            {
                latestLocation.IsHidden = false;
                latestLocation.HiddenAt = null;
                latestLocation.HiddenByUserId = null;
                latestLocation.HiddenReason = null;

                var auditLog = new AuditLog
                {
                    ActionType = AuditActionType.DeviceLocationUnhidden,
                    PerformedByUserId = adminId,
                    EntityName = "DeviceLatestLocation",
                    EntityPublicId = devicePublicId,
                    Description = $"Admin/Manager restored the hidden Live Map marker for device {device.DeviceName}."
                };

                await _context.AuditLogs.AddAsync(auditLog, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                await _locationNotifier.NotifyLocationUnhiddenAsync(devicePublicId, cancellationToken);
            }
        }
    }
}