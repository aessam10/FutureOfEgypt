namespace FutureOfEgypt.Application.Features.Tracking
{
    public sealed class ReceiveLocationUpdateRequest
    {
        public Guid DevicePublicId { get; set; }

        public double Latitude { get; set; }

        public double Longitude { get; set; }

        public bool IsMocked { get; set; }

        public DateTime RecordedAt { get; set; }
    }
}