using FutureOfEgypt.Domain.Common;
using System.Data;
using System.Data.Common;
using System.Net.NetworkInformation;
using System.Reflection.Emit;
using System.Reflection.PortableExecutable;

namespace FutureOfEgypt.Domain.Entities
{
    /// <summary>
    /// Stores the latest known location for each device.
    /// Used by the dashboard for fast live tracking.
    /// </summary>
    public sealed class DeviceLatestLocation : BaseEntity
    {
        public int EngineerId { get; set; }

        public int DeviceId { get; set; }

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        public double? Accuracy { get; set; }

        public double? Speed { get; set; }

        public bool IsMocked { get; set; }// in case an Engineer tried to send a fake location, we can detect it.

        public bool IsOnline { get; set; } = true;

        public bool IsHidden { get; set; }

        public DateTime? HiddenAt { get; set; }

        public Guid? HiddenByUserId { get; set; }

        public string? HiddenReason { get; set; }

        public DateTime RecordedAt { get; set; }

        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        public Engineer? Engineer { get; set; }

        public Device? Device { get; set; }
    }
}