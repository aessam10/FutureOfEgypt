using FutureOfEgypt.Domain.Common;

namespace FutureOfEgypt.Domain.Entities
{
    /// <summary>
    /// Stores every GPS update sent from the Flutter app.
    /// </summary>
    public sealed class LocationHistory : BaseEntity
    {
        public int EngineerId { get; set; }

        public int DeviceId { get; set; }

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        public double? Accuracy { get; set; }

        public double? Speed { get; set; }

        public bool IsMocked { get; set; }

        public DateTime RecordedAt { get; set; }

        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        public Engineer? Engineer { get; set; }

        public Device? Device { get; set; }
    }
}
