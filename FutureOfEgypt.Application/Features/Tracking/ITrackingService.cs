using FutureOfEgypt.Application.Common.Models;

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

        Task<PagedResponse<LocationHistoryResponse>> GetDeviceLocationHistoryAsync(
            Guid devicePublicId,
            LocationHistoryQueryRequest request,
            CancellationToken cancellationToken = default);
    }
}