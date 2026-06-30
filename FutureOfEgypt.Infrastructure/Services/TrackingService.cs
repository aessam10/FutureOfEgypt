using FutureOfEgypt.Application.Common.Helpers;
using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.Tracking;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class TrackingService : ITrackingService
    {
        private readonly AppDbContext _context;
        private readonly ILocationNotifier _locationNotifier;
        private readonly TrackingScheduleOptions _scheduleOptions;
        
        public TrackingService(AppDbContext context, ILocationNotifier locationNotifier, IOptionsSnapshot<TrackingScheduleOptions> scheduleOptions)
        {
            _context = context;
            _locationNotifier = locationNotifier;
            _scheduleOptions = scheduleOptions.Value;
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

        public async Task ReceiveDeviceHealthAsync(
            Guid engineerPublicId,
            DeviceHealthRequest request,
            CancellationToken cancellationToken = default)
        {
            var engineer = await _context.Engineers
                .FirstOrDefaultAsync(
                    x => x.PublicId == engineerPublicId && !x.IsDeleted,
                    cancellationToken);

            if (engineer is null || engineer.Status != EngineerStatus.Active)
                return;

            var device = await _context.Devices
                .FirstOrDefaultAsync(
                    x => x.PublicId == request.DevicePublicId && !x.IsDeleted,
                    cancellationToken);

            if (device is null || device.Status != DeviceStatus.Active)
                return;

            var assignmentExists = await _context.EngineerDevices
                .AnyAsync(
                    x => x.EngineerId == engineer.Id
                         && x.DeviceId == device.Id
                         && x.IsActive
                         && !x.IsDeleted,
                     cancellationToken);

            if (!assignmentExists)
                return;

            var healthStatus = await _context.DeviceTrackingHealthStatuses
                .FirstOrDefaultAsync(x => x.DeviceId == device.Id, cancellationToken);

            if (healthStatus == null)
            {
                healthStatus = new DeviceTrackingHealthStatus
                {
                    DeviceId = device.Id,
                    EngineerId = engineer.Id,
                };
                await _context.DeviceTrackingHealthStatuses.AddAsync(healthStatus, cancellationToken);
            }

            healthStatus.EngineerId = engineer.Id;
            healthStatus.TrackingStatusReason = request.Reason;
            healthStatus.LastHealthReportAt = request.ReportedAtUtc;
            healthStatus.HealthAuthState = request.AuthState;
            healthStatus.LocationPermissionState = request.LocationPermission;
            healthStatus.LocationServiceEnabled = request.LocationServiceEnabled;
            healthStatus.BackgroundPermissionState = request.BackgroundPermission;
            healthStatus.BatteryOptimizationIgnored = request.BatteryOptimizationIgnored;
            healthStatus.InternetAvailable = request.InternetAvailable;
            healthStatus.UpdatedAt = DateTime.UtcNow;

            healthStatus.BackgroundServiceAlive = request.BackgroundServiceAlive;
            healthStatus.LastTickAtUtc = request.LastTickAtUtc;
            healthStatus.LastError = request.LastError;

            await _context.SaveChangesAsync(cancellationToken);
        }


        public async Task<ReceiveLocationUpdateResponse> ReceiveLocationUpdateAsync(
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

            if (request.Accuracy.HasValue && request.Accuracy.Value < 0)
                throw new InvalidOperationException("Invalid accuracy.");

            if (request.Speed.HasValue && request.Speed.Value < 0)
                throw new InvalidOperationException("Invalid speed.");

            var receivedAtUtc = DateTime.UtcNow;
            var checkTime = request.RecordedAt;

            // Sanity check: RecordedAt must not be in the future by more than 10 minutes, and not in the past by more than 24 hours
            if (request.RecordedAt > receivedAtUtc.AddMinutes(10) || request.RecordedAt < receivedAtUtc.AddHours(-24))
            {
                checkTime = receivedAtUtc;
            }

            if (!TrackingScheduleHelper.IsWithinWorkingHours(_scheduleOptions, checkTime))
            {
                var existingLatest = await _context.DeviceLatestLocations
                    .FirstOrDefaultAsync(x => x.DeviceId == device.Id && !x.IsDeleted, cancellationToken);
                    
                if (existingLatest is not null && existingLatest.IsOnline)
                {
                    existingLatest.IsOnline = false;
                    existingLatest.UpdatedAt = DateTime.UtcNow;

                    await _context.EngineerStatusHistories.AddAsync(new EngineerStatusHistory
                    {
                        EngineerId = engineer.Id,
                        DeviceId = device.Id,
                        IsOnline = false,
                        Reason = "Outside working hours",
                        ChangedAtUtc = DateTime.UtcNow
                    }, cancellationToken);

                    await _context.SaveChangesAsync(cancellationToken);
                    
                    if (!existingLatest.IsHidden)
                    {
                        var totalOnline = await _context.DeviceLatestLocations.Where(x => !x.IsDeleted && !x.IsHidden && x.IsOnline).CountAsync(cancellationToken);
                        var totalOffline = await _context.DeviceLatestLocations.Where(x => !x.IsDeleted && !x.IsHidden && !x.IsOnline).CountAsync(cancellationToken);

                        var statusEvent = new EngineerStatusChangedEvent
                        {
                            EngineerPublicId = engineer.PublicId,
                            DevicePublicId = device.PublicId,
                            IsOnline = false,
                            Reason = "Outside working hours",
                            OnlineCount = totalOnline,
                            OfflineCount = totalOffline
                        };
                        await _locationNotifier.NotifyEngineerStatusChangedAsync(statusEvent, cancellationToken);
                    }
                }

                return new ReceiveLocationUpdateResponse
                {
                    Accepted = false,
                    Reason = "OutsideWorkingHours"
                };
            }

            device.LastSeenAtUtc = receivedAtUtc;
            device.UpdatedAt = receivedAtUtc;

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
                    IsOnline = true,
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
                latestLocation.IsOnline = true;
                latestLocation.RecordedAt = request.RecordedAt;
                latestLocation.ReceivedAt = receivedAtUtc;
                latestLocation.UpdatedAt = receivedAtUtc;
            }

            device.LastSeenAtUtc = receivedAtUtc;
            device.UpdatedAt = receivedAtUtc;

            var healthStatus = await _context.DeviceTrackingHealthStatuses
                .FirstOrDefaultAsync(x => x.DeviceId == device.Id, cancellationToken);
            
            if (healthStatus != null && healthStatus.LastHealthReportAt < receivedAtUtc)
            {
                var reason = healthStatus.TrackingStatusReason;
                if (reason == "LocationPermissionDenied" ||
                    reason == "LocationServiceDisabled" ||
                    reason == "AuthExpired" ||
                    reason == "RefreshFailed" ||
                    reason == "DeviceRevoked" ||
                    reason == "DeviceUnassigned" ||
                    reason == "InternetUnavailable")
                {
                    healthStatus.TrackingStatusReason = "Valid";
                }
            }

            var isNewLocation = latestLocation.Id == 0 || _context.Entry(latestLocation).State == EntityState.Added;
            var wasOnlineValue = isNewLocation ? false : (bool)_context.Entry(latestLocation).OriginalValues["IsOnline"]!;

            if (!wasOnlineValue)
            {
                await _context.EngineerStatusHistories.AddAsync(new EngineerStatusHistory
                {
                    EngineerId = engineer.Id,
                    DeviceId = device.Id,
                    IsOnline = true,
                    Reason = "Location update received",
                    ChangedAtUtc = receivedAtUtc
                }, cancellationToken);
            }

            await _context.SaveChangesAsync(cancellationToken);
            
            if (!wasOnlineValue && !latestLocation.IsHidden)
            {
                var totalOnline = await _context.DeviceLatestLocations
                    .Where(x => !x.IsDeleted && !x.IsHidden && x.IsOnline)
                    .CountAsync(cancellationToken);
                    
                var totalOffline = await _context.DeviceLatestLocations
                    .Where(x => !x.IsDeleted && !x.IsHidden && !x.IsOnline)
                    .CountAsync(cancellationToken);

                var statusEvent = new EngineerStatusChangedEvent
                {
                    EngineerPublicId = engineer.PublicId,
                    DevicePublicId = device.PublicId,
                    IsOnline = true,
                    Reason = "Location update received",
                    OnlineCount = totalOnline,
                    OfflineCount = totalOffline
                };
                await _locationNotifier.NotifyEngineerStatusChangedAsync(statusEvent, cancellationToken);
            }

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
                     IsOnline = true,
                     RecordedAt = request.RecordedAt,
                     ReceivedAt = receivedAtUtc,
                     TrackingStatusReason = healthStatus?.TrackingStatusReason,
                     LastHealthReportAt = healthStatus?.LastHealthReportAt,
                     BackgroundServiceAlive = healthStatus?.BackgroundServiceAlive ?? false,
                     BatteryOptimizationIgnored = healthStatus?.BatteryOptimizationIgnored,
                     LastTickAtUtc = healthStatus?.LastTickAtUtc,
                     LastError = healthStatus?.LastError
                 }, cancellationToken);
                 
            return new ReceiveLocationUpdateResponse
            {
                Accepted = true
            };
        }


        public async Task<IReadOnlyList<LatestLocationResponse>> GetLatestLocationsAsync(CancellationToken cancellationToken = default)
        {
            var locationsQuery = from loc in _context.DeviceLatestLocations.AsNoTracking()
                                 join eng in _context.Engineers.AsNoTracking() on loc.EngineerId equals eng.Id
                                 join dev in _context.Devices.AsNoTracking() on loc.DeviceId equals dev.Id
                                 join ed in _context.EngineerDevices.AsNoTracking() on new { EngId = eng.Id, DevId = dev.Id } equals new { EngId = ed.EngineerId, DevId = ed.DeviceId } into edGroup
                                 from ed in edGroup.DefaultIfEmpty()
                                 join u in _context.Users.AsNoTracking() on eng.Id equals u.EngineerId into uGroup
                                 from u in uGroup.DefaultIfEmpty()
                                 join health in _context.DeviceTrackingHealthStatuses.AsNoTracking() on loc.DeviceId equals health.DeviceId into healthGroup
                                 from health in healthGroup.DefaultIfEmpty()
                                 where !loc.IsDeleted && !loc.IsHidden
                                 orderby loc.ReceivedAt descending
                                 select new LatestLocationResponse
                                 {
                                     EngineerPublicId = eng.PublicId,
                                     EngineerName = eng.FullName,
                                     EngineerPhoneNumber = eng.PhoneNumber,
                                     ProfilePhotoUrl = (u != null && u.ProfilePhotoPath != null) ? $"/api/profile/photo/{u.Id}" : null,
                                     IsAuthorized = ed != null && ed.IsActive && !ed.IsDeleted,
                                     DevicePublicId = dev.PublicId,
                                     DeviceName = dev.DeviceName,
                                     Latitude = loc.Latitude,
                                     Longitude = loc.Longitude,
                                     Accuracy = loc.Accuracy,
                                     Speed = loc.Speed,
                                     IsMocked = loc.IsMocked,
                                     IsOnline = loc.IsOnline,
                                     RecordedAt = loc.RecordedAt,
                                     ReceivedAt = loc.ReceivedAt,
                                     TrackingStatusReason = health != null ? health.TrackingStatusReason : null,
                                     LastHealthReportAt = health != null ? health.LastHealthReportAt : null,
                                     BackgroundServiceAlive = health != null && health.BackgroundServiceAlive,
                                     BatteryOptimizationIgnored = health != null ? health.BatteryOptimizationIgnored : null,
                                     LastTickAtUtc = health != null ? health.LastTickAtUtc : null,
                                     LastError = health != null ? health.LastError : null
                                 };

            var locations = await locationsQuery.ToListAsync(cancellationToken);

            if (!TrackingScheduleHelper.IsWithinWorkingHours(_scheduleOptions, DateTime.UtcNow))
            {
                foreach (var loc in locations)
                {
                    loc.IsOnline = false;
                }
            }

            return locations;
        }

        public async Task<IReadOnlyList<LatestLocationResponse>> GetHiddenLatestLocationsAsync(CancellationToken cancellationToken = default)
        {
            var locationsQuery = from loc in _context.DeviceLatestLocations.AsNoTracking()
                                 join eng in _context.Engineers.AsNoTracking() on loc.EngineerId equals eng.Id
                                 join dev in _context.Devices.AsNoTracking() on loc.DeviceId equals dev.Id
                                 join ed in _context.EngineerDevices.AsNoTracking() on new { EngId = eng.Id, DevId = dev.Id } equals new { EngId = ed.EngineerId, DevId = ed.DeviceId } into edGroup
                                 from ed in edGroup.DefaultIfEmpty()
                                 join u in _context.Users.AsNoTracking() on eng.Id equals u.EngineerId into uGroup
                                 from u in uGroup.DefaultIfEmpty()
                                 join health in _context.DeviceTrackingHealthStatuses.AsNoTracking() on loc.DeviceId equals health.DeviceId into healthGroup
                                 from health in healthGroup.DefaultIfEmpty()
                                 where !loc.IsDeleted && loc.IsHidden
                                 orderby loc.ReceivedAt descending
                                 select new LatestLocationResponse
                                 {
                                     EngineerPublicId = eng.PublicId,
                                     EngineerName = eng.FullName,
                                     EngineerPhoneNumber = eng.PhoneNumber,
                                     ProfilePhotoUrl = (u != null && u.ProfilePhotoPath != null) ? $"/api/profile/photo/{u.Id}" : null,
                                     IsAuthorized = ed != null && ed.IsActive && !ed.IsDeleted,
                                     DevicePublicId = dev.PublicId,
                                     DeviceName = dev.DeviceName,
                                     Latitude = loc.Latitude,
                                     Longitude = loc.Longitude,
                                     Accuracy = loc.Accuracy,
                                     Speed = loc.Speed,
                                     IsMocked = loc.IsMocked,
                                     IsOnline = loc.IsOnline,
                                     RecordedAt = loc.RecordedAt,
                                     ReceivedAt = loc.ReceivedAt,
                                     TrackingStatusReason = health != null ? health.TrackingStatusReason : null,
                                     LastHealthReportAt = health != null ? health.LastHealthReportAt : null,
                                     BackgroundServiceAlive = health != null && health.BackgroundServiceAlive,
                                     BatteryOptimizationIgnored = health != null ? health.BatteryOptimizationIgnored : null,
                                     LastTickAtUtc = health != null ? health.LastTickAtUtc : null,
                                     LastError = health != null ? health.LastError : null
                                 };

            var locations = await locationsQuery.ToListAsync(cancellationToken);

            if (!TrackingScheduleHelper.IsWithinWorkingHours(_scheduleOptions, DateTime.UtcNow))
            {
                foreach (var loc in locations)
                {
                    loc.IsOnline = false;
                }
            }

            return locations;
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

        public async Task<IReadOnlyList<LocationHistoryResponse>> GetEngineerLocationHistoryByDateAsync(
            Guid engineerPublicId,
            string dateString,
            int maxPoints,
            CancellationToken cancellationToken = default)
        {
            var engineer = await _context.Engineers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PublicId == engineerPublicId && !x.IsDeleted, cancellationToken);

            if (engineer is null)
                throw new InvalidOperationException("Engineer does not exist.");

            if (!DateTime.TryParseExact(dateString, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var localDate))
                throw new ArgumentException("Invalid date format. Expected yyyy-MM-dd.", nameof(dateString));

            maxPoints = Math.Clamp(maxPoints, 1, 150);

            TimeZoneInfo timeZoneInfo = TimeZoneHelper.GetTimeZone("Africa/Cairo");
            var startOfDayLocal = localDate.Date;
            var endOfDayLocal = startOfDayLocal.AddDays(1);

            var fromUtc = TimeZoneInfo.ConvertTimeToUtc(startOfDayLocal, timeZoneInfo);
            var toUtc = TimeZoneInfo.ConvertTimeToUtc(endOfDayLocal, timeZoneInfo);

            var query = _context.LocationHistories
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .Where(x => x.EngineerId == engineer.Id && !x.IsDeleted)
                .Where(x => x.RecordedAt >= fromUtc && x.RecordedAt < toUtc)
                .OrderBy(x => x.RecordedAt);

            var allPoints = await query
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

            foreach (var p in allPoints)
            {
                p.TimestampLocal = TimeZoneInfo.ConvertTimeFromUtc(p.RecordedAt, timeZoneInfo);
            }

            if (allPoints.Count <= maxPoints)
            {
                return allPoints;
            }

            var result = new List<LocationHistoryResponse>();
            double step = (double)(allPoints.Count - 1) / (maxPoints - 1);
            for (int i = 0; i < maxPoints; i++)
            {
                int index = (int)Math.Round(i * step);
                if (index >= allPoints.Count) index = allPoints.Count - 1;
                result.Add(allPoints[index]);
            }

            return result;
        }

        public async Task<DailyAnalysisResponse> GetDailyAnalysisAsync(
            Guid engineerPublicId,
            string dateString,
            CancellationToken cancellationToken = default)
        {
            var engineer = await _context.Engineers
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PublicId == engineerPublicId && !x.IsDeleted, cancellationToken);

            if (engineer is null)
                throw new InvalidOperationException("Engineer does not exist.");

            if (!DateTime.TryParseExact(dateString, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var localDate))
                throw new ArgumentException("Invalid date format. Expected yyyy-MM-dd.", nameof(dateString));

            TimeZoneInfo timeZoneInfo = TimeZoneHelper.GetTimeZone(_scheduleOptions.TimeZone);
            
            DateTime startLocal;
            DateTime endLocal;

            if (_scheduleOptions.Enabled && TimeSpan.TryParse(_scheduleOptions.StartTime, out var startTime) && TimeSpan.TryParse(_scheduleOptions.EndTime, out var endTime))
            {
                startLocal = localDate.Date + startTime;
                endLocal = localDate.Date + endTime;
            }
            else
            {
                startLocal = localDate.Date;
                endLocal = localDate.Date.AddDays(1).AddSeconds(-1);
            }

            var fromUtc = TimeZoneInfo.ConvertTimeToUtc(startLocal, timeZoneInfo);
            var toUtc = TimeZoneInfo.ConvertTimeToUtc(endLocal, timeZoneInfo);

            var histories = await _context.EngineerStatusHistories
                .AsNoTracking()
                .Where(x => x.EngineerId == engineer.Id && x.ChangedAtUtc >= fromUtc && x.ChangedAtUtc <= toUtc)
                .OrderBy(x => x.ChangedAtUtc)
                .ToListAsync(cancellationToken);

            var previousHistory = await _context.EngineerStatusHistories
                .AsNoTracking()
                .Where(x => x.EngineerId == engineer.Id && x.ChangedAtUtc < fromUtc)
                .OrderByDescending(x => x.ChangedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);

            bool isOnline = previousHistory?.IsOnline ?? false;
            DateTime currentEventTime = fromUtc;

            double onlineMinutes = 0;
            double offlineMinutes = 0;

            var eventsToProcess = new List<(DateTime Time, bool IsOnline)>();
            
            foreach (var history in histories)
            {
                eventsToProcess.Add((history.ChangedAtUtc, history.IsOnline));
            }

            DateTime utcNow = DateTime.UtcNow;
            DateTime endCalculationTime = toUtc < utcNow ? toUtc : utcNow;
            
            if (endCalculationTime < fromUtc)
            {
                 // Window is in the future
                 endCalculationTime = fromUtc;
            }

            foreach (var evt in eventsToProcess)
            {
                if (evt.Time > endCalculationTime)
                    break;

                var duration = (evt.Time - currentEventTime).TotalMinutes;
                if (isOnline)
                    onlineMinutes += duration;
                else
                    offlineMinutes += duration;

                isOnline = evt.IsOnline;
                currentEventTime = evt.Time;
            }

            if (currentEventTime < endCalculationTime)
            {
                var finalDuration = (endCalculationTime - currentEventTime).TotalMinutes;
                if (isOnline)
                    onlineMinutes += finalDuration;
                else
                    offlineMinutes += finalDuration;
            }

            return new DailyAnalysisResponse
            {
                EngineerPublicId = engineer.PublicId,
                Date = dateString,
                AnalysisWindowStartLocal = startLocal,
                AnalysisWindowEndLocal = endLocal,
                OnlineDurationMinutes = (int)Math.Round(onlineMinutes),
                OfflineDurationMinutes = (int)Math.Round(offlineMinutes),
                OnlineDisplay = FormatDuration((int)Math.Round(onlineMinutes)),
                OfflineDisplay = FormatDuration((int)Math.Round(offlineMinutes)),
                HasData = histories.Any() || previousHistory != null,
                IsPartialData = previousHistory == null && histories.Any()
            };
        }

        private string FormatDuration(int minutes)
        {
            var hours = minutes / 60;
            var mins = minutes % 60;
            return $"{hours}h {mins}m";
        }
    }
}