using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.Engineers
{
    public sealed class EngineersQueryRequest : PagedRequest
    {
        public string? Search { get; set; }

        public EngineerStatus? Status { get; set; }
    }
}
