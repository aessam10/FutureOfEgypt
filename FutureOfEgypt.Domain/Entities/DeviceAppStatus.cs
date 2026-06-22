using FutureOfEgypt.Domain.Common;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Domain.Entities
{
    public sealed class DeviceAppStatus : BaseEntity
    {
        public int? DeviceId { get; set; }
        public Device? Device { get; set; }

        public int? EngineerId { get; set; }
        public Engineer? Engineer { get; set; }

        public string InstallationId { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string AppVersionName { get; set; } = string.Empty;
        public int AppVersionCode { get; set; }

        public int? LatestVersionCode { get; set; }
        public int? MinimumRecommendedVersionCode { get; set; }
        public int? MinimumRequiredVersionCode { get; set; }
        public int? MinimumMandatoryVersionCode { get; set; }

        public AppUpdateLevel UpdateLevel { get; set; }
        public AppUpdateStatus Status { get; set; }

        public DateTime LastCheckedAt { get; set; }
        public DateTime LastReportedAt { get; set; }

        public DateTime? LastUpdatePromptShownAt { get; set; }
        public DateTime? LastUpdateStartedAt { get; set; }
        public DateTime? LastUpdateFailedAt { get; set; }

        public string? LastError { get; set; }
        public Guid? RequiredReleasePublicId { get; set; }
    }
}
