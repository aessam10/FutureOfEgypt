using FutureOfEgypt.Domain.Common;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Domain.Entities
{
    public sealed class ChatParticipant : BaseEntity
    {
        public int ConversationId { get; set; }

        public ChatConversation Conversation { get; set; } = null!;

        public Guid UserId { get; set; }

        public ChatParticipantRole Role { get; set; } = ChatParticipantRole.Member;

        public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? LeftAtUtc { get; set; }

        public bool IsMuted { get; set; }

        public int? LastReadMessageId { get; set; }

        public ChatMessage? LastReadMessage { get; set; }
    }
}
