using System;
using System.Collections.Generic;

namespace FutureOfEgypt.Application.Features.Tracking
{
    public sealed class LocationBatchRequest
    {
        public Guid EngineerPublicId { get; set; }

        public Guid DevicePublicId { get; set; }

        public string InstallationId { get; set; } = string.Empty;

        public string DayKey { get; set; } = string.Empty;

        public List<LocationBatchPoint> Points { get; set; } = new();

        public RecoveryDiagnosticsDto? Diagnostics { get; set; }
    }

    public sealed class LocationBatchPoint
    {
        public string LocalId { get; set; } = string.Empty;

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        public double? Accuracy { get; set; }

        public double? Speed { get; set; }

        public bool IsMocked { get; set; }

        public DateTime RecordedAtUtc { get; set; }
    }

    public sealed class RecoveryDiagnosticsDto
    {
        public string RecoveryReason { get; set; } = string.Empty;

        public DateTime? OfflineFromUtc { get; set; }

        public DateTime? OfflineToUtc { get; set; }

        public int UploadedOfflinePointsCount { get; set; }

        public int DroppedPointsCount { get; set; }
    }
}
