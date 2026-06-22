using System.ComponentModel.DataAnnotations;

namespace FutureOfEgypt.Application.Features.AppUpdates
{
    public class CreateAppReleaseRequest
    {
        [Required]
        [MaxLength(50)]
        public string Platform { get; set; } = "Android";

        [Required]
        [MaxLength(50)]
        public string VersionName { get; set; } = string.Empty;

        [Required]
        public int VersionCode { get; set; }

        public int? MinimumRecommendedVersionCode { get; set; }
        public int? MinimumRequiredVersionCode { get; set; }
        public int? MinimumMandatoryVersionCode { get; set; }

        [MaxLength(500)]
        public string? ApkFileName { get; set; }

        [MaxLength(4000)]
        public string? ReleaseNotes { get; set; }
    }
}
