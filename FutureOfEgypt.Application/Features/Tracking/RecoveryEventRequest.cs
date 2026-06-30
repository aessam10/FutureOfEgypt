using System;

namespace FutureOfEgypt.Application.Features.Tracking
{
    public sealed class RecoveryEventRequest
    {
        public Guid EngineerPublicId { get; set; }

        public Guid DevicePublicId { get; set; }

        public string RecoveryReason { get; set; } = string.Empty;

        public string? LastError { get; set; }
    }
}
