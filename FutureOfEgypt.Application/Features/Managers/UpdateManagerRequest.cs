using System.ComponentModel.DataAnnotations;

namespace FutureOfEgypt.Application.Features.Managers
{
    public class UpdateManagerRequest
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }
    }
}
