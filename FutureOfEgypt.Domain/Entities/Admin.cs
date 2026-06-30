using System;
using FutureOfEgypt.Domain.Common;

namespace FutureOfEgypt.Domain.Entities
{
    public sealed class Admin : BaseEntity
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
    }
}
