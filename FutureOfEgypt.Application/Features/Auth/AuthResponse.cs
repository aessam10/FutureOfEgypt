namespace FutureOfEgypt.Application.Features.Auth
{
    public sealed class AuthResponse
    {
        public Guid UserId { get; set; }

        public Guid? EngineerPublicId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();

        public string Token { get; set; } = string.Empty;

        public DateTime ExpiresAtUtc { get; set; }
    }
}