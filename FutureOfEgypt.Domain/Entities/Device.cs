using FutureOfEgypt.Domain.Common;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Domain.Entities
{
    /// <summary>
    /// Represents the tablet/mobile device assigned to an engineer.
    /// </summary>
    public sealed class Device : BaseEntity
    {
        public string DeviceName { get; set; } = string.Empty;

        public string SerialNumber { get; set; } = string.Empty;

        public string? Imei { get; set; }

        public DevicePlatform Platform { get; set; } = DevicePlatform.Android;

        public DeviceStatus Status { get; set; } = DeviceStatus.Active;

        public DateTime? LastSeenAtUtc { get; set; }
    }
}
