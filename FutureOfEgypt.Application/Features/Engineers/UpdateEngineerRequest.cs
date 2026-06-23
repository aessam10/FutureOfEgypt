using System.ComponentModel.DataAnnotations;

namespace FutureOfEgypt.Application.Features.Engineers
{
    public class UpdateEngineerRequest
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }
    }
}
