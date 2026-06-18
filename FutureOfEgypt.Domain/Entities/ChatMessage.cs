using FutureOfEgypt.Domain.Common;

namespace FutureOfEgypt.Domain.Entities
{
    public sealed class ChatMessage : BaseEntity
    {
        public int ConversationId { get; set; }

        public ChatConversation Conversation { get; set; } = null!;

        public Guid SenderUserId { get; set; }

        public string MessageText { get; set; } = string.Empty;

        public ChatMessageType Type { get; set; } = ChatMessageType.Text;

        public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? EditedAtUtc { get; set; }

        public DateTime? DeletedAtUtc { get; set; }
    }
}
