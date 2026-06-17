using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.Dashboard
{
    public sealed class EngineerStatusResponse
    {
        public Guid EngineerPublicId { get; set; }

        public string EngineerName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public string? Email { get; set; }

        public Guid? DevicePublicId { get; set; }

        public string? DeviceName { get; set; }

        public bool HasActiveDevice { get; set; }

        public bool IsOnline { get; set; }

        public DateTime? LastSeenAtUtc { get; set; }

        public double? Latitude { get; set; }

        public double? Longitude { get; set; }

        public double? Accuracy { get; set; }

        public double? Speed { get; set; }

        public bool? IsMocked { get; set; }
    }
}
