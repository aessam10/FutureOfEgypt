using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.DeviceAccessRequests
{
    public sealed class DeviceAccessRequestsQueryRequest : PagedRequest
    {
        public DeviceAccessRequestStatus? Status { get; set; }

        public Guid? EngineerPublicId { get; set; }

        public string? SerialNumber { get; set; }

        public DateTime? FromUtc { get; set; }

        public DateTime? ToUtc { get; set; }
    }
}
