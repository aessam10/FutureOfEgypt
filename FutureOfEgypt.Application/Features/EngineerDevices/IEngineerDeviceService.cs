using FutureOfEgypt.Application.Common.Models;

namespace FutureOfEgypt.Application.Features.EngineerDevices
{
    public interface IEngineerDeviceService
    {
        Task<EngineerDeviceResponse> AssignDeviceAsync(
            Guid adminUserId,
            string adminEmail,
            AssignDeviceRequest request,
            CancellationToken cancellationToken = default);

        Task<PagedResponse<EngineerDeviceResponse>> GetAssignmentsAsync(
            EngineerDevicesQueryRequest request,
            CancellationToken cancellationToken = default);

        Task<PagedResponse<EngineerDeviceResponse>> GetActiveAssignmentsAsync(
            EngineerDevicesQueryRequest request,
            CancellationToken cancellationToken = default);
    }
}