using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.Tracking
{
    public sealed class LatestLocationResponse
    {
        public Guid EngineerPublicId { get; set; }

        public string EngineerName { get; set; } = string.Empty;

        public string? EngineerPhoneNumber { get; set; }

        public string? ProfilePhotoUrl { get; set; }

        public bool IsAuthorized { get; set; }

        public Guid DevicePublicId { get; set; }

        public string DeviceName { get; set; } = string.Empty;

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        public double? Accuracy { get; set; }

        public double? Speed { get; set; }

        public bool IsMocked { get; set; }

        public bool IsOnline { get; set; }

        public DateTime RecordedAt { get; set; }

        public DateTime ReceivedAt { get; set; }

        public string? TrackingStatusReason { get; set; }

        public DateTime? LastHealthReportAt { get; set; }

        public bool BackgroundServiceAlive { get; set; }

        public bool? BatteryOptimizationIgnored { get; set; }

        public DateTime? LastTickAtUtc { get; set; }

        public string? LastError { get; set; }
        public int? TrackingIntervalMs { get; set; }
    }
}
