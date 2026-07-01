namespace FutureOfEgypt.Application.Features.Auth
{
    public sealed class LoginRequest
    {
        public string? Email { get; set; } // Fallback for old clients

        public string Username { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }
}