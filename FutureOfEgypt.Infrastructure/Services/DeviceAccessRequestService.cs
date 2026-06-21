using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.AuditLog;
using FutureOfEgypt.Application.Features.DeviceAccessRequests;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class DeviceAccessRequestService : IDeviceAccessRequestService
    {
        private readonly IAuditLogService _auditLogService;
        private readonly AppDbContext _context;

        public DeviceAccessRequestService(
            AppDbContext context,
            IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
        }

        public async Task<DeviceAccessRequestResponse> CreateRequestAsync(
            Guid engineerPublicId,
            CreateDeviceAccessRequestRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.DeviceName))
                throw new InvalidOperationException("Device name is required.");

            if (string.IsNullOrWhiteSpace(request.SerialNumber))
                throw new InvalidOperationException("Serial number is required.");

            var engineer = await _context.Engineers
                .FirstOrDefaultAsync(
                    x => x.PublicId == engineerPublicId && !x.IsDeleted,
                    cancellationToken);

            if (engineer is null)
                throw new InvalidOperationException("Engineer does not exist.");

            if (engineer.Status != EngineerStatus.Active)
                throw new InvalidOperationException("Engineer is not active.");

            var serialNumber = request.SerialNumber.Trim();

            var installationId = string.IsNullOrWhiteSpace(request.InstallationId)
                ? null
                : request.InstallationId.Trim();

            var existingPendingRequestQuery = _context.DeviceAccessRequests
                .Include(x => x.Engineer)
                .Include(x => x.CreatedDevice)
                .Where(x => x.EngineerId == engineer.Id
                            && x.Status == DeviceAccessRequestStatus.Pending
                            && !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(installationId))
            {
                existingPendingRequestQuery = existingPendingRequestQuery
                    .Where(x => x.InstallationId == installationId);
            }
            else
            {
                existingPendingRequestQuery = existingPendingRequestQuery
                    .Where(x => x.SerialNumber == serialNumber);
            }

            var existingPendingRequest = await existingPendingRequestQuery
                .FirstOrDefaultAsync(cancellationToken);

            if (existingPendingRequest is not null)
                return Map(existingPendingRequest);

            if (!string.IsNullOrWhiteSpace(installationId))
            {
                var installationAlreadyUsed = await _context.Devices
                    .AnyAsync(
                        x => x.InstallationId == installationId
                             && !x.IsDeleted,
                        cancellationToken);

                if (installationAlreadyUsed)
                    throw new InvalidOperationException("This app installation is already registered to a device.");
            }

            var alreadyApprovedDevice = await _context.Devices
                .FirstOrDefaultAsync(
                    x => x.SerialNumber == serialNumber && !x.IsDeleted,
                    cancellationToken);

            if (alreadyApprovedDevice is not null &&
                alreadyApprovedDevice.Status is DeviceStatus.Blocked or DeviceStatus.Lost)
            {
                throw new InvalidOperationException("This device cannot request access.");
            }

            if (alreadyApprovedDevice is not null)
            {
                var activeAssignment = await _context.EngineerDevices
                    .AnyAsync(
                        x => x.EngineerId == engineer.Id
                             && x.DeviceId == alreadyApprovedDevice.Id
                             && x.IsActive
                             && !x.IsDeleted,
                        cancellationToken);

                if (activeAssignment)
                    throw new InvalidOperationException("This device is already approved and assigned to you.");
            }

            var accessRequest = new DeviceAccessRequest
            {
                EngineerId = engineer.Id,
                DeviceName = request.DeviceName.Trim(),
                SerialNumber = serialNumber,
                Imei = request.Imei,
                InstallationId = installationId,
                Platform = request.Platform,
                Status = DeviceAccessRequestStatus.Pending,
                RequestedAtUtc = DateTime.UtcNow
            };

            await _context.DeviceAccessRequests.AddAsync(accessRequest, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            accessRequest.Engineer = engineer;

            return Map(accessRequest);
        }

        public async Task<DeviceAccessRequestResponse?> GetLatestForEngineerAsync(
            Guid engineerPublicId,
            CancellationToken cancellationToken = default)
        {
            var latestRequest = await _context.DeviceAccessRequests
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.CreatedDevice)
                .Where(x => !x.IsDeleted
                            && x.Engineer != null
                            && x.Engineer.PublicId == engineerPublicId)
                .OrderByDescending(x => x.RequestedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);

            return latestRequest is null ? null : MapProjection(latestRequest);
        }

        public async Task<PagedResponse<DeviceAccessRequestResponse>> GetRequestsAsync(
            DeviceAccessRequestsQueryRequest request,
            CancellationToken cancellationToken = default)
        {
            return await GetPagedRequestsAsync(
                request,
                forcePendingOnly: false,
                cancellationToken);
        }

        public async Task<PagedResponse<DeviceAccessRequestResponse>> GetPendingRequestsAsync(
            DeviceAccessRequestsQueryRequest request,
            CancellationToken cancellationToken = default)
        {
            request.Status = DeviceAccessRequestStatus.Pending;

            return await GetPagedRequestsAsync(
                request,
                forcePendingOnly: true,
                cancellationToken);
        }

        private async Task<PagedResponse<DeviceAccessRequestResponse>> GetPagedRequestsAsync(
            DeviceAccessRequestsQueryRequest request,
            bool forcePendingOnly,
            CancellationToken cancellationToken = default)
        {
            if (request.FromUtc.HasValue && request.ToUtc.HasValue && request.FromUtc > request.ToUtc)
                throw new InvalidOperationException("FromUtc cannot be greater than ToUtc.");

            var query = _context.DeviceAccessRequests
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.CreatedDevice)
                .Where(x => !x.IsDeleted);

            if (forcePendingOnly)
            {
                query = query.Where(x => x.Status == DeviceAccessRequestStatus.Pending);
            }
            else if (request.Status.HasValue)
            {
                query = query.Where(x => x.Status == request.Status.Value);
            }

            if (request.EngineerPublicId.HasValue)
            {
                query = query.Where(x => x.Engineer!.PublicId == request.EngineerPublicId.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.SerialNumber))
            {
                var serialNumber = request.SerialNumber.Trim();
                query = query.Where(x => x.SerialNumber == serialNumber);
            }

            if (request.FromUtc.HasValue)
            {
                query = query.Where(x => x.RequestedAtUtc >= request.FromUtc.Value);
            }

            if (request.ToUtc.HasValue)
            {
                query = query.Where(x => x.RequestedAtUtc <= request.ToUtc.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

            var items = await query
                .OrderByDescending(x => x.RequestedAtUtc)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(x => MapProjection(x))
                .ToListAsync(cancellationToken);

            return new PagedResponse<DeviceAccessRequestResponse>
            {
                Items = items,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }

        public async Task<DeviceAccessRequestResponse> ApproveAsync(
            Guid requestPublicId,
            Guid adminUserId,
            string adminEmail,
            ReviewDeviceAccessRequestRequest request,
            CancellationToken cancellationToken = default)
        {
            var accessRequest = await _context.DeviceAccessRequests
                .Include(x => x.Engineer)
                .Include(x => x.CreatedDevice)
                .FirstOrDefaultAsync(
                    x => x.PublicId == requestPublicId && !x.IsDeleted,
                    cancellationToken);

            if (accessRequest is null)
                throw new InvalidOperationException("Device access request does not exist.");

            if (accessRequest.Status != DeviceAccessRequestStatus.Pending)
                throw new InvalidOperationException("Only pending requests can be approved.");

            if (accessRequest.Engineer is null)
                throw new InvalidOperationException("Engineer does not exist.");

            if (accessRequest.Engineer.Status != EngineerStatus.Active)
                throw new InvalidOperationException("Engineer is not active.");

            var now = DateTime.UtcNow;

            Device? device = null;

            if (!string.IsNullOrWhiteSpace(accessRequest.InstallationId))
            {
                device = await _context.Devices
                    .FirstOrDefaultAsync(
                        x => x.InstallationId == accessRequest.InstallationId && !x.IsDeleted,
                        cancellationToken);
            }

            device ??= await _context.Devices
                .FirstOrDefaultAsync(
                    x => x.SerialNumber == accessRequest.SerialNumber && !x.IsDeleted,
                    cancellationToken);

            if (device is not null && device.Status is DeviceStatus.Blocked or DeviceStatus.Lost)
                throw new InvalidOperationException("Blocked or lost devices cannot be approved.");

            if (device is null)
            {
                device = new Device
                {
                    DeviceName = accessRequest.DeviceName,
                    SerialNumber = accessRequest.SerialNumber,
                    Imei = accessRequest.Imei,
                    InstallationId = accessRequest.InstallationId,
                    Platform = accessRequest.Platform,
                    Status = DeviceStatus.Active
                };

                await _context.Devices.AddAsync(device, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
            }
            else
            {
                device.DeviceName = accessRequest.DeviceName;
                device.Imei = accessRequest.Imei;

                if (!string.IsNullOrWhiteSpace(accessRequest.InstallationId))
                {
                    device.InstallationId = accessRequest.InstallationId;
                }

                device.Platform = accessRequest.Platform;
                device.Status = DeviceStatus.Active;
                device.UpdatedAt = now;
            }

            var currentEngineerAssignments = await _context.EngineerDevices
                .Where(x => x.EngineerId == accessRequest.EngineerId
                            && x.IsActive
                            && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var assignment in currentEngineerAssignments)
            {
                assignment.IsActive = false;
                assignment.UnassignedAtUtc = now;
                assignment.UpdatedAt = now;
            }

            var currentDeviceAssignments = await _context.EngineerDevices
                .Where(x => x.DeviceId == device.Id
                            && x.IsActive
                            && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var assignment in currentDeviceAssignments)
            {
                assignment.IsActive = false;
                assignment.UnassignedAtUtc = now;
                assignment.UpdatedAt = now;
            }

            var newAssignment = new EngineerDevice
            {
                EngineerId = accessRequest.EngineerId,
                DeviceId = device.Id,
                AssignedAtUtc = now,
                IsActive = true
            };

            await _context.EngineerDevices.AddAsync(newAssignment, cancellationToken);

            accessRequest.Status = DeviceAccessRequestStatus.Approved;
            accessRequest.ReviewedAtUtc = now;
            accessRequest.ReviewedByUserId = adminUserId;
            accessRequest.ReviewNote = request.ReviewNote;
            accessRequest.CreatedDeviceId = device.Id;
            accessRequest.UpdatedAt = now;
            accessRequest.CreatedDevice = device;

            await _context.SaveChangesAsync(cancellationToken);

            await _auditLogService.CreateAsync(
                new CreateAuditLogRequest
                {
                    ActionType = AuditActionType.DeviceAccessRequestApproved,
                    PerformedByUserId = adminUserId,
                    PerformedByEmail = adminEmail,
                    EntityName = nameof(DeviceAccessRequest),
                    EntityPublicId = accessRequest.PublicId,
                    Description = $"Admin approved device access request for engineer '{accessRequest.Engineer!.FullName}'.",
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        accessRequestPublicId = accessRequest.PublicId,
                        engineerPublicId = accessRequest.Engineer.PublicId,
                        engineerName = accessRequest.Engineer.FullName,
                        devicePublicId = device.PublicId,
                        deviceName = device.DeviceName,
                        serialNumber = device.SerialNumber,
                        installationId = device.InstallationId,
                        reviewNote = request.ReviewNote
                    })
                },
                cancellationToken);

            return Map(accessRequest);
        }

        public async Task<DeviceAccessRequestResponse> RejectAsync(
            Guid requestPublicId,
            Guid adminUserId,
            string adminEmail,
            ReviewDeviceAccessRequestRequest request,
            CancellationToken cancellationToken = default)
        {
            var accessRequest = await _context.DeviceAccessRequests
                .Include(x => x.Engineer)
                .Include(x => x.CreatedDevice)
                .FirstOrDefaultAsync(
                    x => x.PublicId == requestPublicId && !x.IsDeleted,
                    cancellationToken);

            if (accessRequest is null)
                throw new InvalidOperationException("Device access request does not exist.");

            if (accessRequest.Status != DeviceAccessRequestStatus.Pending)
                throw new InvalidOperationException("Only pending requests can be rejected.");

            var now = DateTime.UtcNow;

            accessRequest.Status = DeviceAccessRequestStatus.Rejected;
            accessRequest.ReviewedAtUtc = now;
            accessRequest.ReviewedByUserId = adminUserId;
            accessRequest.ReviewNote = request.ReviewNote;
            accessRequest.UpdatedAt = now;

            await _context.SaveChangesAsync(cancellationToken);

            await _auditLogService.CreateAsync(
                new CreateAuditLogRequest
                {
                    ActionType = AuditActionType.DeviceAccessRequestRejected,
                    PerformedByUserId = adminUserId,
                    PerformedByEmail = adminEmail,
                    EntityName = nameof(DeviceAccessRequest),
                    EntityPublicId = accessRequest.PublicId,
                    Description = $"Admin rejected device access request for engineer '{accessRequest.Engineer!.FullName}'.",
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        accessRequestPublicId = accessRequest.PublicId,
                        engineerPublicId = accessRequest.Engineer.PublicId,
                        engineerName = accessRequest.Engineer.FullName,
                        deviceName = accessRequest.DeviceName,
                        serialNumber = accessRequest.SerialNumber,
                        installationId = accessRequest.InstallationId,
                        reviewNote = request.ReviewNote
                    })
                },
                cancellationToken);

            return Map(accessRequest);
        }

        private static DeviceAccessRequestResponse Map(DeviceAccessRequest request)
        {
            return new DeviceAccessRequestResponse
            {
                PublicId = request.PublicId,

                EngineerPublicId = request.Engineer!.PublicId,
                EngineerName = request.Engineer.FullName,

                DeviceName = request.DeviceName,
                SerialNumber = request.SerialNumber,
                Imei = request.Imei,
                InstallationId = request.InstallationId,
                Platform = request.Platform,
                Status = request.Status,

                RequestedAtUtc = request.RequestedAtUtc,
                ReviewedAtUtc = request.ReviewedAtUtc,
                ReviewedByUserId = request.ReviewedByUserId,
                ReviewNote = request.ReviewNote,

                CreatedDevicePublicId = request.CreatedDevice?.PublicId
            };
        }

        private static DeviceAccessRequestResponse MapProjection(DeviceAccessRequest request)
        {
            return new DeviceAccessRequestResponse
            {
                PublicId = request.PublicId,

                EngineerPublicId = request.Engineer!.PublicId,
                EngineerName = request.Engineer.FullName,

                DeviceName = request.DeviceName,
                SerialNumber = request.SerialNumber,
                Imei = request.Imei,
                InstallationId = request.InstallationId,
                Platform = request.Platform,
                Status = request.Status,

                RequestedAtUtc = request.RequestedAtUtc,
                ReviewedAtUtc = request.ReviewedAtUtc,
                ReviewedByUserId = request.ReviewedByUserId,
                ReviewNote = request.ReviewNote,

                CreatedDevicePublicId = request.CreatedDevice != null
                    ? request.CreatedDevice.PublicId
                    : null
            };
        }
    }
}