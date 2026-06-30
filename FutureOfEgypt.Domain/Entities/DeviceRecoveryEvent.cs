using FutureOfEgypt.Domain.Common;

namespace FutureOfEgypt.Domain.Entities
{
    public sealed class DeviceRecoveryEvent : BaseEntity
    {
        public int DeviceId { get; set; }

        public int EngineerId { get; set; }

        public string RecoveryReason { get; set; } = string.Empty;

        public DateTime? FromUtc { get; set; }

        public DateTime? ToUtc { get; set; }

        public int UploadedPointsCount { get; set; }

        public int DroppedPointsCount { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public Engineer? Engineer { get; set; }

        public Device? Device { get; set; }
    }
}
