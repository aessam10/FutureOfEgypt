namespace FutureOfEgypt.Application.Features.Tracking
{
    public interface ITrackingService
    {
        Task ReceiveLocationUpdateAsync(
            Guid engineerPublicId,
            ReceiveLocationUpdateRequest request,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<LatestLocationResponse>> GetLatestLocationsAsync(
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<LocationHistoryResponse>> GetDeviceLocationHistoryAsync(
            Guid devicePublicId,
            DateTime? from,
            DateTime? to,
            CancellationToken cancellationToken = default);
    }
}