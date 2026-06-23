using FutureOfEgypt.Domain.Common;
using System;

namespace FutureOfEgypt.Domain.Entities
{
    /// <summary>
    /// Records when an engineer transitions between Online and Offline status,
    /// used for accurate Daily Analysis.
    /// </summary>
    public sealed class EngineerStatusHistory : BaseEntity
    {
        public int EngineerId { get; set; }

        public int? DeviceId { get; set; }

        public bool IsOnline { get; set; }

        public string? Reason { get; set; }

        public DateTime ChangedAtUtc { get; set; }

        public Engineer? Engineer { get; set; }

        public Device? Device { get; set; }
    }
}
