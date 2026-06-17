using FutureOfEgypt.Application.Common.Models; 

namespace FutureOfEgypt.Application.Features.AuditLog
{
    public interface IAuditLogService
    {
        Task CreateAsync(
            CreateAuditLogRequest request,
            CancellationToken cancellationToken = default);

        Task<PagedResponse<AuditLogResponse>> GetLogsAsync(
            AuditLogsQueryRequest request,
            CancellationToken cancellationToken = default);
    }
}
