using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.Engineers
{
    public sealed class CreateEngineerRequest
    {
        public string FullName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public string? Email { get; set; }

        public EngineerStatus Status { get; set; } = EngineerStatus.Active;
    }
}