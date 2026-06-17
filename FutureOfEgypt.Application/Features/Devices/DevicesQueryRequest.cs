using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.Devices
{
    public sealed class DevicesQueryRequest : PagedRequest
    {
        public string? Search { get; set; }

        public DeviceStatus? Status { get; set; }

        public DevicePlatform? Platform { get; set; }
    }
}
