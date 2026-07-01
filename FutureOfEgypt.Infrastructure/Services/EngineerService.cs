using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.AuditLog;
using FutureOfEgypt.Application.Features.Engineers;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

using Microsoft.AspNetCore.Identity;
using FutureOfEgypt.Infrastructure.Identity;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class EngineerService : IEngineerService
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService;
        private readonly UserManager<ApplicationUser> _userManager;
        
        public EngineerService(
            AppDbContext context,
            IAuditLogService auditLogService,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _auditLogService = auditLogService;
            _userManager = userManager;
        }

        public async Task<EngineerResponse> CreateEngineerAsync(
            Guid adminUserId,
            string adminEmail,
            CreateEngineerRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new InvalidOperationException("Engineer full name is required.");

            var engineer = new Engineer
            {
                FullName = request.FullName.Trim(),
                PhoneNumber = request.PhoneNumber,
                Email = request.Email,
                Status = request.Status
            };

            await _context.Engineers.AddAsync(engineer, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            await _auditLogService.CreateAsync(
    new CreateAuditLogRequest
    {
        ActionType = AuditActionType.EngineerCreated,
        PerformedByUserId = adminUserId,
        PerformedByEmail = adminEmail,
        EntityName = nameof(Engineer),
        EntityPublicId = engineer.PublicId,
        Description = $"Admin created engineer '{engineer.FullName}'.",
        MetadataJson = JsonSerializer.Serialize(new
        {
            engineerPublicId = engineer.PublicId,
            engineerName = engineer.FullName,
            engineer.PhoneNumber,
            engineer.Email,
            engineer.Status
        })
    },
    cancellationToken);
            return new EngineerResponse
            {
                PublicId = engineer.PublicId,
                FullName = engineer.FullName,
                PhoneNumber = engineer.PhoneNumber,
                Email = engineer.Email,
                Status = engineer.Status,
                CreatedAt = engineer.CreatedAt
            };
        }

        public async Task<PagedResponse<EngineerResponse>> GetEngineersAsync(
    EngineersQueryRequest request,
    CancellationToken cancellationToken = default)
        {
            var query = _context.Engineers
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim().ToLower();

                query = query.Where(x =>
                    x.FullName.ToLower().Contains(search)
                    || (x.Email != null && x.Email.ToLower().Contains(search))
                    || (x.PhoneNumber != null && x.PhoneNumber.Contains(search)));
            }

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.Status == request.Status.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

            var items = await query
                .OrderBy(x => x.FullName)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(x => new
                {
                    Engineer = x,
                    User = _context.Users.FirstOrDefault(u => u.EngineerId == x.Id)
                })
                .Select(x => new EngineerResponse
                {
                    PublicId = x.Engineer.PublicId,
                    FullName = x.Engineer.FullName,
                    PhoneNumber = x.Engineer.PhoneNumber,
                    Email = x.Engineer.Email,
                    Username = x.User != null ? x.User.UserName : null,
                    Status = x.Engineer.Status,
                    CreatedAt = x.Engineer.CreatedAt,
                    UserPublicId = x.User != null ? x.User.Id : null,
                    ProfilePhotoUrl = x.User != null && !string.IsNullOrEmpty(x.User.ProfilePhotoPath)
                        ? $"/api/profile/photo/{x.User.Id}?v={x.User.ConcurrencyStamp}"
                        : null
                })
                .ToListAsync(cancellationToken);

            return new PagedResponse<EngineerResponse>
            {
                Items = items,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }

        public async Task<EngineerResponse> UpdateEngineerStatusAsync(
    Guid adminUserId,
    string adminEmail,
    Guid engineerPublicId,
    UpdateEngineerStatusRequest request,
    CancellationToken cancellationToken = default)
        {
            var engineer = await _context.Engineers
                .FirstOrDefaultAsync(
                    x => x.PublicId == engineerPublicId && !x.IsDeleted,
                    cancellationToken);

            if (engineer is null)
                throw new InvalidOperationException("Engineer does not exist.");

            var oldStatus = engineer.Status;

            if (oldStatus == request.Status)
            {
                return new EngineerResponse
                {
                    PublicId = engineer.PublicId,
                    FullName = engineer.FullName,
                    PhoneNumber = engineer.PhoneNumber,
                    Email = engineer.Email,
                    Status = engineer.Status,
                    CreatedAt = engineer.CreatedAt
                };
            }

            engineer.Status = request.Status;
            engineer.UpdatedAt = DateTime.UtcNow;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.EngineerId == engineer.Id, cancellationToken);
            if (user != null)
            {
                user.IsSuspended = request.Status == EngineerStatus.Suspended;
                await _userManager.UpdateAsync(user);
            }

            if (request.Status != EngineerStatus.Active)
            {
                var latestLocations = await _context.DeviceLatestLocations
                    .Where(x => x.EngineerId == engineer.Id && x.IsOnline && !x.IsDeleted)
                    .ToListAsync(cancellationToken);
                
                foreach (var loc in latestLocations)
                {
                    loc.IsOnline = false;
                    loc.UpdatedAt = DateTime.UtcNow;
                    _context.EngineerStatusHistories.Add(new EngineerStatusHistory
                    {
                        EngineerId = loc.EngineerId,
                        DeviceId = loc.DeviceId,
                        IsOnline = false,
                        Reason = $"Engineer status changed to {request.Status}",
                        ChangedAtUtc = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            var actionType = request.Status switch
            {
                EngineerStatus.Active => AuditActionType.EngineerActivated,
                EngineerStatus.Inactive => AuditActionType.EngineerInactivated,
                EngineerStatus.Suspended => AuditActionType.EngineerSuspended,
                _ => AuditActionType.EngineerInactivated
            };

            await _auditLogService.CreateAsync(
                new CreateAuditLogRequest
                {
                    ActionType = actionType,
                    PerformedByUserId = adminUserId,
                    PerformedByEmail = adminEmail,
                    EntityName = nameof(Engineer),
                    EntityPublicId = engineer.PublicId,
                    Description = $"Admin changed engineer '{engineer.FullName}' status from '{oldStatus}' to '{request.Status}'.",
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        engineerPublicId = engineer.PublicId,
                        engineerName = engineer.FullName,
                        oldStatus,
                        newStatus = request.Status,
                        reason = request.Reason
                    })
                },
                cancellationToken);

            return new EngineerResponse
            {
                PublicId = engineer.PublicId,
                FullName = engineer.FullName,
                PhoneNumber = engineer.PhoneNumber,
                Email = engineer.Email,
                Status = engineer.Status,
                CreatedAt = engineer.CreatedAt
            };
        }

        public async Task<EngineerResponse> UpdateEngineerAsync(
            Guid adminUserId, string adminEmail, Guid engineerPublicId, UpdateEngineerRequest request, CancellationToken cancellationToken = default)
        {
            var engineer = await _context.Engineers.FirstOrDefaultAsync(x => x.PublicId == engineerPublicId && !x.IsDeleted, cancellationToken);
            if (engineer == null) throw new InvalidOperationException("Engineer does not exist.");

            engineer.FullName = request.FullName.Trim();
            engineer.PhoneNumber = request.PhoneNumber?.Trim();
            engineer.Email = request.Email.Trim();
            engineer.UpdatedAt = DateTime.UtcNow;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.EngineerId == engineer.Id, cancellationToken);
            if (user != null)
            {
                user.FullName = engineer.FullName;
                user.PhoneNumber = engineer.PhoneNumber;
                user.Email = engineer.Email;
                await _userManager.UpdateAsync(user);
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _auditLogService.CreateAsync(new CreateAuditLogRequest
            {
                ActionType = AuditActionType.EngineerCreated, // generic update
                PerformedByUserId = adminUserId,
                PerformedByEmail = adminEmail,
                EntityName = nameof(Engineer),
                EntityPublicId = engineer.PublicId,
                Description = $"Admin updated engineer '{engineer.FullName}'.",
                MetadataJson = JsonSerializer.Serialize(new { engineerPublicId = engineer.PublicId, email = engineer.Email })
            }, cancellationToken);

            return new EngineerResponse
            {
                PublicId = engineer.PublicId,
                FullName = engineer.FullName,
                PhoneNumber = engineer.PhoneNumber,
                Email = engineer.Email,
                Status = engineer.Status,
                CreatedAt = engineer.CreatedAt
            };
        }

        public async Task DeleteEngineerAsync(
            Guid adminUserId, string adminEmail, Guid engineerPublicId, CancellationToken cancellationToken = default)
        {
            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var engineer = await _context.Engineers.FirstOrDefaultAsync(x => x.PublicId == engineerPublicId && !x.IsDeleted, cancellationToken);
                if (engineer == null) throw new InvalidOperationException("Engineer does not exist.");

                engineer.IsDeleted = true;
                engineer.UpdatedAt = DateTime.UtcNow;

                var user = await _context.Users.FirstOrDefaultAsync(u => u.EngineerId == engineer.Id, cancellationToken);
                if (user != null)
                {
                    user.IsDeleted = true;
                    user.IsSuspended = true;

                    if (!string.IsNullOrEmpty(user.ProfilePhotoPath))
                    {
                        var oldPath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), user.ProfilePhotoPath);
                        if (System.IO.File.Exists(oldPath))
                        {
                            System.IO.File.Delete(oldPath);
                        }
                        user.ProfilePhotoPath = null;
                    }

                    await _userManager.UpdateAsync(user);
                }

                var activeAssignments = await _context.EngineerDevices
                    .Where(ed => ed.EngineerId == engineer.Id && ed.IsActive && !ed.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var ed in activeAssignments)
                {
                    ed.IsActive = false;
                    ed.UnassignedAtUtc = DateTime.UtcNow;
                    ed.UpdatedAt = DateTime.UtcNow;
                }

                var latestLocations = await _context.DeviceLatestLocations
                    .Where(x => x.EngineerId == engineer.Id && x.IsOnline && !x.IsDeleted)
                    .ToListAsync(cancellationToken);
                
                foreach (var loc in latestLocations)
                {
                    loc.IsOnline = false;
                    loc.UpdatedAt = DateTime.UtcNow;
                    _context.EngineerStatusHistories.Add(new EngineerStatusHistory
                    {
                        EngineerId = loc.EngineerId,
                        DeviceId = loc.DeviceId,
                        IsOnline = false,
                        Reason = "Engineer deleted",
                        ChangedAtUtc = DateTime.UtcNow
                    });
                }

                var pendingRequests = await _context.DeviceAccessRequests
                    .Where(x => x.EngineerId == engineer.Id && x.Status == DeviceAccessRequestStatus.Pending && !x.IsDeleted)
                    .ToListAsync(cancellationToken);

                foreach (var req in pendingRequests)
                {
                    req.Status = DeviceAccessRequestStatus.Cancelled;
                    req.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync(cancellationToken);

                await _auditLogService.CreateAsync(new CreateAuditLogRequest
                {
                    ActionType = AuditActionType.EngineerInactivated, // generic delete
                    PerformedByUserId = adminUserId,
                    PerformedByEmail = adminEmail,
                    EntityName = nameof(Engineer),
                    EntityPublicId = engineer.PublicId,
                    Description = $"Admin soft-deleted engineer '{engineer.FullName}'.",
                    MetadataJson = JsonSerializer.Serialize(new { engineerPublicId = engineer.PublicId, email = engineer.Email })
                }, cancellationToken);

                await transaction.CommitAsync(cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}