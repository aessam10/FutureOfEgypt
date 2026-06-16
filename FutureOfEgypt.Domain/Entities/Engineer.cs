using FutureOfEgypt.Domain.Common;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Domain.Entities
{
    /// <summary>
    /// Represents the engineer who is being tracked.
    /// </summary>
    public sealed class Engineer : BaseEntity
    {
        public string FullName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public string? Email { get; set; }

        public EngineerStatus Status { get; set; } = EngineerStatus.Inactive;
    }
}
