using FutureOfEgypt.Application.Common.Models;

namespace FutureOfEgypt.Application.Features.EngineerDevices
{
    public sealed class EngineerDevicesQueryRequest : PagedRequest
    {
        public Guid? EngineerPublicId { get; set; }

        public Guid? DevicePublicId { get; set; }

        public bool? IsActive { get; set; }

        public string? Search { get; set; }
    }
}
