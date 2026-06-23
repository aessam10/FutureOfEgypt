namespace FutureOfEgypt.Application.Features.Tracking
{
    public class EngineerStatusChangedEvent
    {
        public Guid EngineerPublicId { get; set; }
        public Guid DevicePublicId { get; set; }
        public bool IsOnline { get; set; }
        public string? Reason { get; set; }
        public int OnlineCount { get; set; }
        public int OfflineCount { get; set; }
    }
}
