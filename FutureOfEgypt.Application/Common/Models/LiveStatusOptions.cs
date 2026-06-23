namespace FutureOfEgypt.Application.Common.Models
{
    public class LiveStatusOptions
    {
        public int StaleAfterMinutes { get; set; } = 15;
        public int MonitorIntervalSeconds { get; set; } = 60;
    }
}
