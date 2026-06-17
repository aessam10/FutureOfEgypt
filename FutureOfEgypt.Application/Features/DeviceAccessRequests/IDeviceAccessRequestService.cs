using FutureOfEgypt.Application.Common.Models;

namespace FutureOfEgypt.Application.Features.DeviceAccessRequests
{
    public interface IDeviceAccessRequestService
    {
        Task<DeviceAccessRequestResponse> CreateRequestAsync(
            Guid engineerPublicId,
            CreateDeviceAccessRequestRequest request,
            CancellationToken cancellationToken = default);

        Task<PagedResponse<DeviceAccessRequestResponse>> GetRequestsAsync(
            DeviceAccessRequestsQueryRequest request,
            CancellationToken cancellationToken = default);

        Task<PagedResponse<DeviceAccessRequestResponse>> GetPendingRequestsAsync(
            DeviceAccessRequestsQueryRequest request,
            CancellationToken cancellationToken = default);
        Task<DeviceAccessRequestResponse> ApproveAsync(
            Guid requestPublicId,
            Guid adminUserId,
            string adminEmail,
            ReviewDeviceAccessRequestRequest request,
            CancellationToken cancellationToken = default);

        Task<DeviceAccessRequestResponse> RejectAsync(
            Guid requestPublicId,
            Guid adminUserId,
            string adminEmail,
            ReviewDeviceAccessRequestRequest request,
            CancellationToken cancellationToken = default);
    }
}
