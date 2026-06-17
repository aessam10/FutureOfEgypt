using FutureOfEgypt.Application.Common.Models;

namespace FutureOfEgypt.Application.Features.Tracking
{
    public sealed class LocationHistoryQueryRequest : PagedRequest
    {
        public DateTime? FromUtc { get; set; }

        public DateTime? ToUtc { get; set; }
    }
}
