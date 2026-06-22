namespace FutureOfEgypt.Application.Features.AppUpdates
{
    public class AppReleaseAdminResponse
    {
        public string PublicId { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string VersionName { get; set; } = string.Empty;
        public int VersionCode { get; set; }
        public int? MinimumRecommendedVersionCode { get; set; }
        public int? MinimumRequiredVersionCode { get; set; }
        public int? MinimumMandatoryVersionCode { get; set; }
        public bool IsActive { get; set; }
        public string ApkFileName { get; set; } = string.Empty;
        public string ApkDownloadUrl { get; set; } = string.Empty;
        public string ApkSha256 { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
        public string? ReleaseNotes { get; set; }
        public DateTime PublishedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
