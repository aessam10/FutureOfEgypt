using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.Chat
{
    public sealed class CreateDirectChatRequest
    {
        public Guid TargetUserId { get; set; }
    }

    public sealed class CreateGroupChatRequest
    {
        public string Title { get; set; } = string.Empty;

        public List<Guid> ParticipantUserIds { get; set; } = new();
    }

    public sealed class SendChatMessageRequest
    {
        public string MessageText { get; set; } = string.Empty;
    }

    public sealed class ChatConversationResponse
    {
        public Guid PublicId { get; set; }

        public string? Title { get; set; }

        public int Type { get; set; }

        public DateTime LastMessageAtUtc { get; set; }

        public int UnreadCount { get; set; }

        public ChatMessagePreviewResponse? LastMessage { get; set; }

        public List<ChatParticipantResponse> Participants { get; set; } = new();

        public bool CanSendMessage { get; set; } = true;

        public bool IsMuted { get; set; }

        public DateTime? MutedUntilUtc { get; set; }

        public bool IsArchived { get; set; }
    }

    public sealed class ChatParticipantResponse
    {
        public Guid UserId { get; set; }

        public string DisplayName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? ProfileImageUrl { get; set; }

        public int Role { get; set; }

        public bool IsAvailable { get; set; } = true;
    }

    public sealed class ChatMessageResponse
    {
        public Guid PublicId { get; set; }

        public Guid SenderUserId { get; set; }

        public string SenderName { get; set; } = string.Empty;

        public string? ProfileImageUrl { get; set; }

        public string MessageText { get; set; } = string.Empty;

        public int Type { get; set; }

        public DateTime SentAtUtc { get; set; }

        public bool IsMine { get; set; }
    }

    public sealed class ChatMessagePreviewResponse
    {
        public Guid PublicId { get; set; }

        public Guid SenderUserId { get; set; }

        public string SenderName { get; set; } = string.Empty;

        public string? ProfileImageUrl { get; set; }

        public string MessageText { get; set; } = string.Empty;

        public DateTime SentAtUtc { get; set; }
    }
    public sealed class ChatUserSearchResponse
    {
        public Guid UserId { get; set; }

        public string DisplayName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? ProfileImageUrl { get; set; }

        public bool IsAvailable { get; set; } = true;
    }

    public sealed class AddChatParticipantsRequest
    {
        public List<Guid> UserIds { get; set; } = new();
    }

    public sealed class ChatRealtimeMessageResponse
    {
        public Guid PublicId { get; set; }

        public Guid ConversationPublicId { get; set; }

        public Guid SenderUserId { get; set; }

        public string SenderName { get; set; } = string.Empty;

        public string? ProfileImageUrl { get; set; }

        public string MessageText { get; set; } = string.Empty;

        public int Type { get; set; }

        public DateTime SentAtUtc { get; set; }
    }
}
