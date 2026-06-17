namespace FutureOfEgypt.Application.Features.Devices
{
    public interface IDeviceService
    {
        Task<DeviceResponse> CreateDeviceAsync(
                   Guid adminUserId,
                   string adminEmail,
                   CreateDeviceRequest request,
                   CancellationToken cancellationToken = default);

        Task<IReadOnlyList<DeviceResponse>> GetDevicesAsync(
            CancellationToken cancellationToken = default);

        Task<DeviceResponse> UpdateDeviceStatusAsync(
            Guid adminUserId,
            string adminEmail,
            Guid devicePublicId,
            UpdateDeviceStatusRequest request,
            CancellationToken cancellationToken = default);
    }
}