using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.Auth
{
    public sealed class RegisterEngineerCompleteRequest
    {
        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public string Password { get; set; } = string.Empty;

        public EngineerStatus Status { get; set; } = EngineerStatus.Active;
    }
}
