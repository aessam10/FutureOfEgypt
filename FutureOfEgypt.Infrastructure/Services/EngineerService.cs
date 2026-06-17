using FutureOfEgypt.Application.Features.AuditLog;
using FutureOfEgypt.Application.Features.Engineers;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class EngineerService : IEngineerService
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService;
        public EngineerService(
            AppDbContext context,
            IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
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

        public async Task<IReadOnlyList<EngineerResponse>> GetEngineersAsync(
            CancellationToken cancellationToken = default)
        {
            return await _context.Engineers
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new EngineerResponse
                {
                    PublicId = x.PublicId,
                    FullName = x.FullName,
                    PhoneNumber = x.PhoneNumber,
                    Email = x.Email,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
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
    }
}