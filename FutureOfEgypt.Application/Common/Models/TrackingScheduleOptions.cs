namespace FutureOfEgypt.Application.Common.Models
{
    public class TrackingScheduleOptions
    {
        public bool Enabled { get; set; } = true;
        public string TimeZone { get; set; } = "Africa/Cairo";
        public string StartTime { get; set; } = "08:30";
        public string EndTime { get; set; } = "17:00";
    }
}
