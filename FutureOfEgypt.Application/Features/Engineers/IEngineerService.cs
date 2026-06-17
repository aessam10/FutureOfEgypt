using FutureOfEgypt.Application.Common.Models;

namespace FutureOfEgypt.Application.Features.Engineers
{
    public interface IEngineerService
    {
        Task<EngineerResponse> CreateEngineerAsync(
            Guid adminUserId,
            string adminEmail,
            CreateEngineerRequest request,
            CancellationToken cancellationToken = default);

        Task<PagedResponse<EngineerResponse>> GetEngineersAsync(
            EngineersQueryRequest request,
            CancellationToken cancellationToken = default);

        Task<EngineerResponse> UpdateEngineerStatusAsync(
            Guid adminUserId,
            string adminEmail,
            Guid engineerPublicId,
            UpdateEngineerStatusRequest request,
            CancellationToken cancellationToken = default);
    }
}