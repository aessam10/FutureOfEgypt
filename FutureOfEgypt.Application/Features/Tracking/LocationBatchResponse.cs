using System.Collections.Generic;

namespace FutureOfEgypt.Application.Features.Tracking
{
    public sealed class LocationBatchResponse
    {
        public List<string> AcceptedLocalIds { get; set; } = new();

        public int SavedCount { get; set; }

        public int DuplicateCount { get; set; }

        public string StatusReason { get; set; } = "Valid";
    }
}
