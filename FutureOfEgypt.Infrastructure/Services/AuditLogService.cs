using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.AuditLog;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class AuditLogService : IAuditLogService
    {
        private readonly AppDbContext _context;

        public AuditLogService(AppDbContext context)
        {
            _context = context;
        }

        public async Task CreateAsync(
            CreateAuditLogRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.EntityName))
                throw new InvalidOperationException("Audit entity name is required.");

            if (string.IsNullOrWhiteSpace(request.Description))
                throw new InvalidOperationException("Audit description is required.");

            var auditLog = new AuditLog
            {
                ActionType = request.ActionType,
                PerformedByUserId = request.PerformedByUserId,
                PerformedByEmail = request.PerformedByEmail,
                EntityName = request.EntityName,
                EntityPublicId = request.EntityPublicId,
                Description = request.Description,
                MetadataJson = request.MetadataJson,
                PerformedAtUtc = DateTime.UtcNow
            };

            await _context.AuditLogs.AddAsync(auditLog, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<PagedResponse<AuditLogResponse>> GetLogsAsync(
            AuditLogsQueryRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request.FromUtc.HasValue && request.ToUtc.HasValue && request.FromUtc > request.ToUtc)
                throw new InvalidOperationException("FromUtc cannot be greater than ToUtc.");

            var query = _context.AuditLogs
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

            if (request.ActionType.HasValue)
            {
                query = query.Where(x => x.ActionType == request.ActionType.Value);
            }

            if (request.PerformedByUserId.HasValue)
            {
                query = query.Where(x => x.PerformedByUserId == request.PerformedByUserId.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.EntityName))
            {
                var entityName = request.EntityName.Trim();

                query = query.Where(x => x.EntityName == entityName);
            }

            if (request.EntityPublicId.HasValue)
            {
                query = query.Where(x => x.EntityPublicId == request.EntityPublicId.Value);
            }

            if (request.FromUtc.HasValue)
            {
                query = query.Where(x => x.PerformedAtUtc >= request.FromUtc.Value);
            }

            if (request.ToUtc.HasValue)
            {
                query = query.Where(x => x.PerformedAtUtc <= request.ToUtc.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

            var items = await query
                .OrderByDescending(x => x.PerformedAtUtc)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(x => new AuditLogResponse
                {
                    PublicId = x.PublicId,
                    ActionType = x.ActionType,
                    PerformedByUserId = x.PerformedByUserId,
                    PerformedByEmail = x.PerformedByEmail,
                    EntityName = x.EntityName,
                    EntityPublicId = x.EntityPublicId,
                    Description = x.Description,
                    MetadataJson = x.MetadataJson,
                    PerformedAtUtc = x.PerformedAtUtc
                })
                .ToListAsync(cancellationToken);

            return new PagedResponse<AuditLogResponse>
            {
                Items = items,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }
    }
}
