using FutureOfEgypt.Application.Features.Chat;
using Microsoft.AspNetCore.SignalR;

namespace FutureOfEgypt.Services
{
    public sealed class SignalRChatRealtimeNotifier : IChatRealtimeNotifier
    {
        private readonly IHubContext<ChatHub> _hubContext;

        public SignalRChatRealtimeNotifier(IHubContext<ChatHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task NotifyMessageSentAsync(
            Guid conversationPublicId,
            IReadOnlyCollection<Guid> participantUserIds,
            ChatRealtimeMessageResponse message,
            CancellationToken cancellationToken = default)
        {
            await _hubContext.Clients
                .Group(ChatHub.GetConversationGroupName(conversationPublicId))
                .SendAsync("messageReceived", message, cancellationToken);

            foreach (var userId in participantUserIds.Distinct())
            {
                await _hubContext.Clients
                    .Group(ChatHub.GetUserGroupName(userId))
                    .SendAsync("conversationUpdated", new
                    {
                        conversationPublicId,
                        lastMessage = message,
                        updatedAtUtc = message.SentAtUtc
                    }, cancellationToken);
            }
        }

        public async Task NotifyConversationReadAsync(
            Guid conversationPublicId,
            Guid userId,
            int? lastReadMessageId,
            CancellationToken cancellationToken = default)
        {
            await _hubContext.Clients
                .Group(ChatHub.GetConversationGroupName(conversationPublicId))
                .SendAsync("conversationRead", new
                {
                    conversationPublicId,
                    userId,
                    lastReadMessageId,
                    readAtUtc = DateTime.UtcNow
                }, cancellationToken);
        }
        public async Task NotifyParticipantsChangedAsync(
    Guid conversationPublicId,
    IReadOnlyCollection<Guid> affectedUserIds,
    string action,
    CancellationToken cancellationToken = default)
        {
            await _hubContext.Clients
                .Group(ChatHub.GetConversationGroupName(conversationPublicId))
                .SendAsync("participantsChanged", new
                {
                    conversationPublicId,
                    action,
                    affectedUserIds,
                    changedAtUtc = DateTime.UtcNow
                }, cancellationToken);

            foreach (var userId in affectedUserIds.Distinct())
            {
                await _hubContext.Clients
                    .Group(ChatHub.GetUserGroupName(userId))
                    .SendAsync("participantsChanged", new
                    {
                        conversationPublicId,
                        action,
                        affectedUserIds,
                        changedAtUtc = DateTime.UtcNow
                    }, cancellationToken);
            }
        }
    }
}
