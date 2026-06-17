using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.DeviceAccessRequests
{
    public sealed class CreateDeviceAccessRequestRequest
    {
        public string DeviceName { get; set; } = string.Empty;

        public string SerialNumber { get; set; } = string.Empty;

        public string? Imei { get; set; }

        public string? InstallationId { get; set; }

        public DevicePlatform Platform { get; set; } = DevicePlatform.Android;
    }
}
