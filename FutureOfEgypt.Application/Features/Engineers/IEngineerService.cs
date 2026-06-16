namespace FutureOfEgypt.Application.Features.Engineers
{
    public interface IEngineerService
    {
        Task<EngineerResponse> CreateEngineerAsync(
            CreateEngineerRequest request,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<EngineerResponse>> GetEngineersAsync(
            CancellationToken cancellationToken = default);
    }
}