namespace FutureOfEgypt.Application.Features.Auth
{
    public sealed class UserAccountResponse
    {
        public Guid UserId { get; set; }

        public Guid? EngineerPublicId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();

        public DateTime CreatedAtUtc { get; set; }
    }
}
