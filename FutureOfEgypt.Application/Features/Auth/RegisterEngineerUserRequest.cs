namespace FutureOfEgypt.Application.Features.Auth
{
    public sealed class RegisterEngineerUserRequest
    {
        public Guid EngineerPublicId { get; set; }

        public required string Username { get; set; }

        public string Email { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }
}