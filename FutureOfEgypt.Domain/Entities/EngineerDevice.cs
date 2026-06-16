using FutureOfEgypt.Domain.Common;

namespace FutureOfEgypt.Domain.Entities
{
    /// <summary>
    /// Represents the assignment between an engineer and a device.
    /// </summary>
    public sealed class EngineerDevice : BaseEntity
    {
        public int EngineerId { get; set; }
        public int DeviceId { get; set; }

        public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? UnassignedAtUtc { get; set; }

        public bool IsActive { get; set; } = true;

        public Engineer? Engineer { get; set; }

        public Device? Device { get; set; }
    }
}
