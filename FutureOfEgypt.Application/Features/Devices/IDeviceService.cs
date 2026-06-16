namespace FutureOfEgypt.Application.Features.Devices
{
    public interface IDeviceService
    {
        Task<DeviceResponse> CreateDeviceAsync(
            CreateDeviceRequest request,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<DeviceResponse>> GetDevicesAsync(
            CancellationToken cancellationToken = default);
    }
}