using FutureOfEgypt.Domain.Common;
using FutureOfEgypt.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Domain.Entities
{
    public sealed class ChatConversation : BaseEntity
    {
        public string? Title { get; set; }

        public ChatConversationType Type { get; set; }

        public Guid CreatedByUserId { get; set; }

        public DateTime LastMessageAtUtc { get; set; } = DateTime.UtcNow;

        public ICollection<ChatParticipant> Participants { get; set; } = new List<ChatParticipant>();

        public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
    }
}
