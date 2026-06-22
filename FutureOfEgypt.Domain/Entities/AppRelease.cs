using FutureOfEgypt.Domain.Common;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Domain.Entities
{
    /// <summary>
    /// Represents a published Android APK release.
    /// The binary APK is stored on disk in AppFiles/AndroidReleases/.
    /// </summary>
    public sealed class AppRelease : BaseEntity
    {
        /// <summary>Target platform. e.g. "Android"</summary>
        public string Platform { get; set; } = "Android";

        /// <summary>Human-readable version string. e.g. "1.0.4"</summary>
        public string VersionName { get; set; } = string.Empty;

        /// <summary>Integer version code used for comparisons. e.g. 104</summary>
        public int VersionCode { get; set; }

        /// <summary>
        /// Devices below this code are shown an Optional/soft update prompt.
        /// Null means no recommended threshold.
        /// </summary>
        public int? MinimumRecommendedVersionCode { get; set; }

        /// <summary>
        /// Devices below this code are shown a Required/strong update prompt.
        /// Null means no required threshold.
        /// </summary>
        public int? MinimumRequiredVersionCode { get; set; }

        /// <summary>
        /// Devices below this code are blocked and must update (Mandatory).
        /// Null means no mandatory threshold.
        /// </summary>
        public int? MinimumMandatoryVersionCode { get; set; }

        /// <summary>
        /// Whether this is the currently active release used for update checks.
        /// Only one Android release should be active at a time.
        /// </summary>
        public bool IsActive { get; set; } = false;

        /// <summary>Physical filename of the APK stored under AppFiles/AndroidReleases/</summary>
        public string ApkFileName { get; set; } = string.Empty;

        /// <summary>Full download URL exposed through the API download endpoint.</summary>
        public string ApkDownloadUrl { get; set; } = string.Empty;

        /// <summary>SHA-256 hex digest of the APK file for client-side verification.</summary>
        public string ApkSha256 { get; set; } = string.Empty;

        /// <summary>File size in bytes.</summary>
        public long FileSizeBytes { get; set; }

        /// <summary>Release notes shown to engineers.</summary>
        public string? ReleaseNotes { get; set; }

        /// <summary>UTC timestamp when this release was published/activated.</summary>
        public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
    }
}
