using FutureOfEgypt.Domain.Common;

namespace FutureOfEgypt.Domain.Entities
{
    /// <summary>
    /// Stores every GPS update sent from the Flutter app.
    /// </summary>
    public sealed class LocationHistory : BaseEntity
    {
        public Guid EngineerId { get; set; }

        public Guid DeviceId { get; set; }

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        public bool IsMocked { get; set; }// in case an Engineer tried to send a fake location, we can detect it.

        public DateTime RecordedAt { get; set; }

        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        public Engineer? Engineer { get; set; }

        public Device? Device { get; set; }
    }
}
