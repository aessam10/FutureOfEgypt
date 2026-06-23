using System.ComponentModel.DataAnnotations;

namespace FutureOfEgypt.Application.Features.Profile
{
    public class UpdateProfileRequest
    {
        [Required(ErrorMessage = "Full Name is required.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        public string Email { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }
    }
}
