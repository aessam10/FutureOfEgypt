using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.AuditLog;
using FutureOfEgypt.Application.Features.Devices;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class DeviceService : IDeviceService
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService;

        public DeviceService(
            AppDbContext context,
            IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
        }
        public async Task<DeviceResponse> CreateDeviceAsync(
            Guid adminUserId,
            string adminEmail,
            CreateDeviceRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.DeviceName))
                throw new InvalidOperationException("Device name is required.");

            if (string.IsNullOrWhiteSpace(request.SerialNumber))
                throw new InvalidOperationException("Serial number is required.");

            var serialExists = await _context.Devices
                .AnyAsync(x => x.SerialNumber == request.SerialNumber && !x.IsDeleted, cancellationToken);

            if (serialExists)
                throw new InvalidOperationException("Serial number already exists.");

            var device = new Device
            {
                DeviceName = request.DeviceName.Trim(),
                SerialNumber = request.SerialNumber.Trim(),
                Imei = request.Imei,
                InstallationId = string.IsNullOrWhiteSpace(request.InstallationId)
    ? null
    : request.InstallationId.Trim(),
                Platform = request.Platform,
                Status = request.Status
            };

            await _context.Devices.AddAsync(device, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            await _auditLogService.CreateAsync(
    new CreateAuditLogRequest
    {
        ActionType = AuditActionType.DeviceCreated,
        PerformedByUserId = adminUserId,
        PerformedByEmail = adminEmail,
        EntityName = nameof(Device),
        EntityPublicId = device.PublicId,
        Description = $"Admin created device '{device.DeviceName}'.",
        MetadataJson = JsonSerializer.Serialize(new
        {
            devicePublicId = device.PublicId,
            deviceName = device.DeviceName,
            device.SerialNumber,
            device.Imei,
            device.InstallationId,
            device.Platform,
            device.Status
        })
    },
    cancellationToken);
            return new DeviceResponse
            {
                PublicId = device.PublicId,
                DeviceName = device.DeviceName,
                SerialNumber = device.SerialNumber,
                Imei = device.Imei,
                InstallationId = device.InstallationId,
                Platform = device.Platform,
                Status = device.Status,
                LastSeenAtUtc = device.LastSeenAtUtc,
                CreatedAt = device.CreatedAt,
                AssignedEngineerName = null // newly created device has no assignment
            };
        }

        public async Task<PagedResponse<DeviceResponse>> GetDevicesAsync(
    DevicesQueryRequest request,
    CancellationToken cancellationToken = default)
        {
            var query = _context.Devices
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim().ToLower();

                query = query.Where(x =>
                    x.DeviceName.ToLower().Contains(search)
                    || x.SerialNumber.ToLower().Contains(search)
                    || (x.Imei != null && x.Imei.ToLower().Contains(search))
                    || (x.InstallationId != null && x.InstallationId.ToLower().Contains(search)));
            }

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.Status == request.Status.Value);
            }

            if (request.Platform.HasValue)
            {
                query = query.Where(x => x.Platform == request.Platform.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

            var items = await query
                .OrderBy(x => x.DeviceName)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(x => new DeviceResponse
                {
                    PublicId = x.PublicId,
                    DeviceName = x.DeviceName,
                    SerialNumber = x.SerialNumber,
                    Imei = x.Imei,
                    InstallationId = x.InstallationId,
                    Platform = x.Platform,
                    Status = x.Status,
                    LastSeenAtUtc = x.LastSeenAtUtc,
                    CreatedAt = x.CreatedAt,
                    AssignedEngineerName = _context.EngineerDevices
                        .Where(ed => ed.DeviceId == x.Id && ed.IsActive && !ed.IsDeleted)
                        .Select(ed => ed.Engineer!.FullName)
                        .FirstOrDefault()
                })
                .ToListAsync(cancellationToken);

            return new PagedResponse<DeviceResponse>
            {
                Items = items,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }

        public async Task<DeviceResponse> UpdateDeviceStatusAsync(
    Guid adminUserId,
    string adminEmail,
    Guid devicePublicId,
    UpdateDeviceStatusRequest request,
    CancellationToken cancellationToken = default)
        {
            var device = await _context.Devices
                .FirstOrDefaultAsync(
                    x => x.PublicId == devicePublicId && !x.IsDeleted,
                    cancellationToken);

            if (device is null)
                throw new InvalidOperationException("Device does not exist.");

            var oldStatus = device.Status;

            if (oldStatus == request.Status)
            {
                return new DeviceResponse
                {
                    PublicId = device.PublicId,
                    DeviceName = device.DeviceName,
                    SerialNumber = device.SerialNumber,
                    Imei = device.Imei,
                    InstallationId = device.InstallationId,
                    Platform = device.Platform,
                    Status = device.Status,
                    LastSeenAtUtc = device.LastSeenAtUtc,
                    CreatedAt = device.CreatedAt,
                    AssignedEngineerName = await _context.EngineerDevices
                        .Where(ed => ed.DeviceId == device.Id && ed.IsActive && !ed.IsDeleted)
                        .Select(ed => ed.Engineer!.FullName)
                        .FirstOrDefaultAsync(cancellationToken)
                };
            }

            device.Status = request.Status;
            device.UpdatedAt = DateTime.UtcNow;

            if (request.Status is DeviceStatus.Blocked or DeviceStatus.Lost)
            {
                var activeAssignments = await _context.EngineerDevices
                    .Where(x => x.DeviceId == device.Id && x.IsActive && !x.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var assignment in activeAssignments)
                {
                    assignment.IsActive = false;
                    assignment.UnassignedAtUtc = DateTime.UtcNow;
                    assignment.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            var actionType = request.Status switch
            {
                DeviceStatus.Active => AuditActionType.DeviceActivated,
                DeviceStatus.Inactive => AuditActionType.DeviceInactivated,
                DeviceStatus.Blocked => AuditActionType.DeviceBlocked,
                DeviceStatus.Lost => AuditActionType.DeviceMarkedLost,
                _ => AuditActionType.DeviceInactivated
            };

            await _auditLogService.CreateAsync(
                new CreateAuditLogRequest
                {
                    ActionType = actionType,
                    PerformedByUserId = adminUserId,
                    PerformedByEmail = adminEmail,
                    EntityName = nameof(Device),
                    EntityPublicId = device.PublicId,
                    Description = $"Admin changed device '{device.DeviceName}' status from '{oldStatus}' to '{request.Status}'.",
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        devicePublicId = device.PublicId,
                        deviceName = device.DeviceName,
                        serialNumber = device.SerialNumber,
                        installationId = device.InstallationId,
                        oldStatus,
                        newStatus = request.Status,
                        reason = request.Reason
                    })
                },
                cancellationToken);

            return new DeviceResponse
            {
                PublicId = device.PublicId,
                DeviceName = device.DeviceName,
                SerialNumber = device.SerialNumber,
                Imei = device.Imei,
                InstallationId = device.InstallationId,
                Platform = device.Platform,
                Status = device.Status,
                LastSeenAtUtc = device.LastSeenAtUtc,
                CreatedAt = device.CreatedAt,
                AssignedEngineerName = await _context.EngineerDevices
                    .Where(ed => ed.DeviceId == device.Id && ed.IsActive && !ed.IsDeleted)
                    .Select(ed => ed.Engineer!.FullName)
                    .FirstOrDefaultAsync(cancellationToken)
            };
        }
    }
}