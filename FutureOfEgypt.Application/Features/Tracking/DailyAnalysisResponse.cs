using System;

namespace FutureOfEgypt.Application.Features.Tracking
{
    public class DailyAnalysisResponse
    {
        public Guid EngineerPublicId { get; set; }
        public string Date { get; set; } = string.Empty;
        public DateTime AnalysisWindowStartLocal { get; set; }
        public DateTime AnalysisWindowEndLocal { get; set; }
        public int OnlineDurationMinutes { get; set; }
        public int OfflineDurationMinutes { get; set; }
        public string OnlineDisplay { get; set; } = string.Empty;
        public string OfflineDisplay { get; set; } = string.Empty;
        public bool HasData { get; set; }
        public bool IsPartialData { get; set; }
    }
}
