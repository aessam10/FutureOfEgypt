using FutureOfEgypt.Domain.Common;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Domain.Entities
{
    public sealed class EmailMessage : BaseEntity
    {
        public Guid SenderUserId { get; set; }

        public string SenderFullName { get; set; } = string.Empty;

        public string FromEmail { get; set; } = string.Empty;

        public string ToEmails { get; set; } = string.Empty;

        public string? CcEmails { get; set; }

        public string? BccEmails { get; set; }

        public string Subject { get; set; } = string.Empty;

        public string Body { get; set; } = string.Empty;

        public EmailMessageStatus Status { get; set; } = EmailMessageStatus.Draft;

        public string? ProviderMessageId { get; set; }

        public string? ErrorMessage { get; set; }

        public DateTime? SentAtUtc { get; set; }
    }
}
