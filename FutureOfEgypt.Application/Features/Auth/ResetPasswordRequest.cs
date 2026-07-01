namespace FutureOfEgypt.Application.Features.Auth
{
    public class ResetPasswordRequest
    {
        public required string Username { get; set; }
        public required string Token { get; set; }
        public required string NewPassword { get; set; }
    }
}
