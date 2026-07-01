using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.AuditLog;
using FutureOfEgypt.Application.Features.EngineerDevices;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using FutureOfEgypt.Infrastructure.Extensions;
using System.Text.Json;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class EngineerDeviceService : IEngineerDeviceService
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService;

        public EngineerDeviceService(
            AppDbContext context,
            IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
        }

        public async Task<EngineerDeviceResponse> AssignDeviceAsync(
            Guid adminUserId,
            string adminEmail,
            AssignDeviceRequest request,
            CancellationToken cancellationToken = default)
        {
            var engineer = await _context.Engineers
                .FirstOrDefaultAsync(
                    x => x.PublicId == request.EngineerPublicId && !x.IsDeleted,
                    cancellationToken);

            if (engineer is null || engineer.IsDeleted)
                throw new InvalidOperationException("Engineer does not exist.");

            if (engineer.Status != EngineerStatus.Active)
                throw new InvalidOperationException("Engineer is not active.");

            var device = await _context.Devices
                .FirstOrDefaultAsync(
                    x => x.PublicId == request.DevicePublicId && !x.IsDeleted,
                    cancellationToken);

            if (device is null || device.IsDeleted)
                throw new InvalidOperationException("Device does not exist.");

            if (device.Status != DeviceStatus.Active)
                throw new InvalidOperationException("Device is not active.");

            var sameActiveAssignment = await _context.EngineerDevices.AsNoTracking().Include(x => x.Engineer).Include(x => x.Device)
                .FirstOrDefaultAsync(x => x.EngineerId == engineer.Id&& x.DeviceId == device.Id&& x.IsActive && !x.IsDeleted, cancellationToken);

            if (sameActiveAssignment is not null)
            {
                return new EngineerDeviceResponse
                {
                    PublicId = sameActiveAssignment.PublicId,

                    EngineerPublicId = sameActiveAssignment.Engineer!.PublicId,
                    EngineerName = sameActiveAssignment.Engineer.FullName,

                    DevicePublicId = sameActiveAssignment.Device!.PublicId,
                    DeviceName = sameActiveAssignment.Device.DeviceName,

                    IsActive = sameActiveAssignment.IsActive,
                    AssignedAtUtc = sameActiveAssignment.AssignedAtUtc,
                    UnassignedAtUtc = sameActiveAssignment.UnassignedAtUtc
                };
            }

            // Deactivate stale assignments for this engineer or device first
            var staleAssignments = await _context.EngineerDevices
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .Where(x => x.IsActive && !x.IsDeleted && (x.EngineerId == engineer.Id || x.DeviceId == device.Id))
                .ToListAsync(cancellationToken);

            var staleToUpdate = staleAssignments.Where(x => 
                x.Engineer == null 
                || x.Engineer.IsDeleted 
                || x.Engineer.Status != EngineerStatus.Active
                || x.Device == null
                || x.Device.IsDeleted
                || x.Device.Status != DeviceStatus.Active
            ).ToList();

            if (staleToUpdate.Any())
            {
                foreach (var assignment in staleToUpdate)
                {
                    assignment.IsActive = false;
                    assignment.UnassignedAtUtc = DateTime.UtcNow;
                    assignment.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync(cancellationToken);
            }

            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var now = DateTime.UtcNow;

                var currentEngineerAssignments = await _context.EngineerDevices
                    .Where(x => x.EngineerId == engineer.Id
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
                    EngineerId = engineer.Id,
                    DeviceId = device.Id,
                    AssignedAtUtc = now,
                    IsActive = true
                };

                await _context.EngineerDevices.AddAsync(newAssignment, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                await _auditLogService.CreateAsync(
                    new CreateAuditLogRequest
                    {
                        ActionType = AuditActionType.DeviceAssignedToEngineer,
                        PerformedByUserId = adminUserId,
                        PerformedByEmail = adminEmail,
                        EntityName = nameof(EngineerDevice),
                        EntityPublicId = newAssignment.PublicId,
                        Description = $"Admin assigned device '{device.DeviceName}' to engineer '{engineer.FullName}'.",
                        MetadataJson = JsonSerializer.Serialize(new
                        {
                            assignmentPublicId = newAssignment.PublicId,
                            engineerPublicId = engineer.PublicId,
                            engineerName = engineer.FullName,
                            devicePublicId = device.PublicId,
                            deviceName = device.DeviceName,
                            serialNumber = device.SerialNumber
                        })
                    },
                    cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                return new EngineerDeviceResponse
                {
                    PublicId = newAssignment.PublicId,

                    EngineerPublicId = engineer.PublicId,
                    EngineerName = engineer.FullName,

                    DevicePublicId = device.PublicId,
                    DeviceName = device.DeviceName,

                    IsActive = newAssignment.IsActive,
                    AssignedAtUtc = newAssignment.AssignedAtUtc,
                    UnassignedAtUtc = newAssignment.UnassignedAtUtc
                };
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        public async Task<PagedResponse<EngineerDeviceResponse>> GetAssignmentsAsync(
            EngineerDevicesQueryRequest request,
            CancellationToken cancellationToken = default)
        {
            return await GetPagedAssignmentsAsync(
                request,
                forceActiveOnly: false,
                cancellationToken);
        }

        public async Task<PagedResponse<EngineerDeviceResponse>> GetActiveAssignmentsAsync(
            EngineerDevicesQueryRequest request,
            CancellationToken cancellationToken = default)
        {
            request.IsActive = true;

            return await GetPagedAssignmentsAsync(
                request,
                forceActiveOnly: true,
                cancellationToken);
        }

        private async Task<PagedResponse<EngineerDeviceResponse>> GetPagedAssignmentsAsync(
            EngineerDevicesQueryRequest request,
            bool forceActiveOnly,
            CancellationToken cancellationToken = default)
        {
            var query = _context.EngineerDevices
                .AsNoTracking()
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .Where(x => !x.IsDeleted && x.Engineer != null && !x.Engineer.IsDeleted && x.Device != null && !x.Device.IsDeleted);

            if (forceActiveOnly)
            {
                query = query.FilterValidActive();
            }
            else if (request.IsActive.HasValue)
            {
                if (request.IsActive.Value)
                {
                    query = query.FilterValidActive();
                }
                else
                {
                    query = query.Where(x => !x.IsActive 
                                             || x.Engineer == null
                                             || x.Engineer.IsDeleted
                                             || x.Engineer.Status != EngineerStatus.Active 
                                             || x.Device == null
                                             || x.Device.IsDeleted
                                             || x.Device.Status != DeviceStatus.Active);
                }
            }

            if (request.EngineerPublicId.HasValue)
            {
                query = query.Where(x => x.Engineer!.PublicId == request.EngineerPublicId.Value);
            }

            if (request.DevicePublicId.HasValue)
            {
                query = query.Where(x => x.Device!.PublicId == request.DevicePublicId.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim().ToLower();

                query = query.Where(x =>
                    x.Engineer!.FullName.ToLower().Contains(search)
                    || x.Device!.DeviceName.ToLower().Contains(search)
                    || x.Device.SerialNumber.ToLower().Contains(search));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

            var items = await query
                .OrderByDescending(x => x.AssignedAtUtc)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(x => new EngineerDeviceResponse
                {
                    PublicId = x.PublicId,

                    EngineerPublicId = x.Engineer!.PublicId,
                    EngineerName = x.Engineer.FullName,

                    DevicePublicId = x.Device!.PublicId,
                    DeviceName = x.Device.DeviceName,

                    IsActive = x.IsActive,
                    AssignedAtUtc = x.AssignedAtUtc,
                    UnassignedAtUtc = x.UnassignedAtUtc
                })
                .ToListAsync(cancellationToken);

            return new PagedResponse<EngineerDeviceResponse>
            {
                Items = items,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }

        public async Task UnassignDeviceAsync(
            Guid adminUserId,
            string adminEmail,
            Guid assignmentPublicId,
            CancellationToken cancellationToken = default)
        {
            var assignment = await _context.EngineerDevices
                .Include(x => x.Engineer)
                .Include(x => x.Device)
                .FirstOrDefaultAsync(x => x.PublicId == assignmentPublicId && !x.IsDeleted, cancellationToken);

            if (assignment is null)
                throw new InvalidOperationException("Assignment does not exist.");

            if (!assignment.IsActive)
                throw new InvalidOperationException("Assignment is already inactive.");

            var now = DateTime.UtcNow;
            assignment.IsActive = false;
            assignment.UnassignedAtUtc = now;
            assignment.UpdatedAt = now;

            _context.EngineerDevices.Update(assignment);

            var latestLoc = await _context.DeviceLatestLocations
                .FirstOrDefaultAsync(x => x.DeviceId == assignment.DeviceId && x.EngineerId == assignment.EngineerId && !x.IsDeleted, cancellationToken);
            if (latestLoc != null)
            {
                latestLoc.IsOnline = false;
                latestLoc.UpdatedAt = now;
                _context.DeviceLatestLocations.Update(latestLoc);

                _context.EngineerStatusHistories.Add(new EngineerStatusHistory
                {
                    EngineerId = latestLoc.EngineerId,
                    DeviceId = latestLoc.DeviceId,
                    IsOnline = false,
                    Reason = "Unassigned from device",
                    ChangedAtUtc = now
                });
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _auditLogService.CreateAsync(
                new CreateAuditLogRequest
                {
                    ActionType = AuditActionType.DeviceInactivated,
                    PerformedByUserId = adminUserId,
                    PerformedByEmail = adminEmail,
                    EntityName = nameof(EngineerDevice),
                    EntityPublicId = assignment.PublicId,
                    Description = $"Admin unassigned device '{assignment.Device?.DeviceName}' from engineer '{assignment.Engineer?.FullName}'.",
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        assignmentPublicId = assignment.PublicId,
                        engineerPublicId = assignment.Engineer?.PublicId,
                        engineerName = assignment.Engineer?.FullName,
                        devicePublicId = assignment.Device?.PublicId,
                        deviceName = assignment.Device?.DeviceName
                    })
                },
                cancellationToken);
        }
    }
}