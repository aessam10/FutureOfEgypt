namespace FutureOfEgypt.Application.Features.Auth
{
    public sealed class AuthResponse
    {
        public Guid UserId { get; set; }

        public Guid? EngineerPublicId { get; set; }

        public Guid? DevicePublicId { get; set; }

        public string? DeviceName { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public List<string> Roles { get; set; } = new();

        public string Token { get; set; } = string.Empty;

        public DateTime ExpiresAtUtc { get; set; }

        public string RefreshToken { get; set; } = string.Empty;

        public DateTime RefreshTokenExpiresAtUtc { get; set; }
    }
}