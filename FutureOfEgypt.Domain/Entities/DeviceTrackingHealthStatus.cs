using FutureOfEgypt.Domain.Common;

namespace FutureOfEgypt.Domain.Entities
{
    public sealed class DeviceTrackingHealthStatus : BaseEntity
    {
        public int DeviceId { get; set; }

        public int EngineerId { get; set; }

        public string? TrackingStatusReason { get; set; }

        public DateTime? LastHealthReportAt { get; set; }

        public string? HealthAuthState { get; set; }

        public string? LocationPermissionState { get; set; }

        public bool LocationServiceEnabled { get; set; }

        public string? BackgroundPermissionState { get; set; }

        public bool? BatteryOptimizationIgnored { get; set; }

        public bool InternetAvailable { get; set; }

        public bool BackgroundServiceAlive { get; set; }

        public DateTime? LastTickAtUtc { get; set; }

        public string? LastError { get; set; }

        public Device? Device { get; set; }

        public Engineer? Engineer { get; set; }
    }
}
