using FutureOfEgypt.Domain.Common;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Domain.Entities
{
    public sealed class DeviceAccessRequest : BaseEntity
    {
        public int EngineerId { get; set; }

        public string DeviceName { get; set; } = string.Empty;

        public string SerialNumber { get; set; } = string.Empty;

        public string? Imei { get; set; }

        public string? InstallationId { get; set; }

        public DevicePlatform Platform { get; set; } = DevicePlatform.Android;

        public DeviceAccessRequestStatus Status { get; set; } = DeviceAccessRequestStatus.Pending;

        public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? ReviewedAtUtc { get; set; }

        public Guid? ReviewedByUserId { get; set; }

        public string? ReviewNote { get; set; }

        public int? CreatedDeviceId { get; set; }

        public Engineer? Engineer { get; set; }

        public Device? CreatedDevice { get; set; }
    }
}
