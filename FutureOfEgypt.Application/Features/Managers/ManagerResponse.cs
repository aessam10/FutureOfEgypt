namespace FutureOfEgypt.Application.Features.Managers
{
    public class ManagerResponse
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Role { get; set; } = string.Empty;
        public string? ProfilePhotoUrl { get; set; }
        public bool IsSuspended { get; set; }
    }
}
