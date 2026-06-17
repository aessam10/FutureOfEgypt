using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.Engineers
{
    public sealed class UpdateEngineerStatusRequest
    {
        public EngineerStatus Status { get; set; }

        public string? Reason { get; set; }
    }
}
