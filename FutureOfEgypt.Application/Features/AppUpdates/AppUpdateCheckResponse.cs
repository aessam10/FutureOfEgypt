using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.AppUpdates
{
    public class AppUpdateCheckResponse
    {
        public string Platform { get; set; } = string.Empty;
        public int CurrentVersionCode { get; set; }
        public string LatestVersionName { get; set; } = string.Empty;
        public int LatestVersionCode { get; set; }
        public int? MinimumRecommendedVersionCode { get; set; }
        public int? MinimumRequiredVersionCode { get; set; }
        public int? MinimumMandatoryVersionCode { get; set; }
        public AppUpdateLevel UpdateLevel { get; set; }
        public bool IsUpdateAvailable { get; set; }
        public bool IsBlocking { get; set; }
        public string DownloadUrl { get; set; } = string.Empty;
        public string ApkSha256 { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
        public string? ReleaseNotes { get; set; }
    }
}
