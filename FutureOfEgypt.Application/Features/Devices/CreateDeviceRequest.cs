using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.Devices
{
    public sealed class CreateDeviceRequest
    {
        public string DeviceName { get; set; } = string.Empty;

        public string SerialNumber { get; set; } = string.Empty;

        public string? Imei { get; set; }

        public DevicePlatform Platform { get; set; } = DevicePlatform.Android;

        public DeviceStatus Status { get; set; } = DeviceStatus.Active;
    }
}