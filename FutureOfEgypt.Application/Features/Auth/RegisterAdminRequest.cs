namespace FutureOfEgypt.Application.Features.Auth
{
    public sealed class RegisterAdminRequest
    {
        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }
}