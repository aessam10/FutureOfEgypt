namespace FutureOfEgypt.Application.Features.Auth
{
    public class ForgotPasswordRequest
    {
        public required string Username { get; set; }
        public required string Email { get; set; }
    }
}
