using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Infrastructure.Identity
{
    public sealed class RefreshToken
    {
        public int Id { get; set; }

        public string TokenHash { get; set; } = string.Empty;

        public Guid UserId { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime ExpiresAtUtc { get; set; }

        public DateTime? RevokedAtUtc { get; set; }

        public string? ReplacedByTokenHash { get; set; }

        public bool IsRevoked => RevokedAtUtc.HasValue;

        public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;

        public bool IsActive => !IsRevoked && !IsExpired;

        public ApplicationUser? User { get; set; }
    }
}
