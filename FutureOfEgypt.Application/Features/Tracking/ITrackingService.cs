using FutureOfEgypt.Application.Common.Models;

namespace FutureOfEgypt.Application.Features.Tracking
{
    public interface ITrackingService
    {
        Task ReceiveLocationUpdateAsync(
            Guid engineerPublicId,
            ReceiveLocationUpdateRequest request,
            CancellationToken cancellationToken = default);

        Task<DeviceValidationResponse> ValidateDeviceAsync(
            Guid engineerPublicId,
            DeviceValidationRequest request,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<LatestLocationResponse>> GetLatestLocationsAsync(
            CancellationToken cancellationToken = default);

        Task<PagedResponse<LocationHistoryResponse>> GetDeviceLocationHistoryAsync(
            Guid devicePublicId,
            LocationHistoryQueryRequest request,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<LatestLocationResponse>> GetHiddenLatestLocationsAsync(CancellationToken cancellationToken = default);

        Task HideLatestLocationAsync(Guid devicePublicId, Guid adminId, CancellationToken cancellationToken = default);

        Task UnhideLatestLocationAsync(Guid devicePublicId, Guid adminId, CancellationToken cancellationToken = default);
    }
}