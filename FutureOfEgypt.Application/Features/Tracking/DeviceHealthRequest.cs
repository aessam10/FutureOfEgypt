namespace FutureOfEgypt.Application.Features.Tracking
{
    public sealed class DeviceHealthRequest
    {
        public Guid DevicePublicId { get; set; }

        public Guid EngineerPublicId { get; set; }

        public string? LocationPermission { get; set; }

        public bool LocationServiceEnabled { get; set; }

        public string? BatteryOptimizationIgnored { get; set; }

        public bool InternetAvailable { get; set; }

        public string? AuthState { get; set; }

        public string? BackgroundPermission { get; set; }

        public string? Reason { get; set; }

        public DateTime ReportedAtUtc { get; set; }
    }
}
