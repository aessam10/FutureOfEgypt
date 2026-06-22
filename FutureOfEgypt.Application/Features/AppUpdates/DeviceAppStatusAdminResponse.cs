using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.AppUpdates
{
    public class DeviceAppStatusAdminResponse
    {
        public string InstallationId { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        
        public Guid? EngineerPublicId { get; set; }
        public string? EngineerName { get; set; }
        
        public Guid? DevicePublicId { get; set; }
        public string? DeviceName { get; set; }
        
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
        public DateTime? LastUpdateStartedAt { get; set; }
        public DateTime? LastUpdateFailedAt { get; set; }
        
        public string? LastError { get; set; }
        public DateTime? LastLocationReceivedAt { get; set; }
    }
}
