using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.Devices
{
    public sealed class UpdateDeviceStatusRequest
    {
        public DeviceStatus Status { get; set; }

        public string? Reason { get; set; }
    }
}
