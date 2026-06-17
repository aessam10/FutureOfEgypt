using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.Tracking
{
    public sealed class LatestLocationResponse
    {
        public Guid EngineerPublicId { get; set; }

        public string EngineerName { get; set; } = string.Empty;

        public Guid DevicePublicId { get; set; }

        public string DeviceName { get; set; } = string.Empty;

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        public double? Accuracy { get; set; }

        public double? Speed { get; set; }

        public bool IsMocked { get; set; }

        public DateTime RecordedAt { get; set; }

        public DateTime ReceivedAt { get; set; }
    }
}
