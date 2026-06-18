using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.Chat
{
    public interface IChatRealtimeNotifier
    {
        Task NotifyMessageSentAsync(
            Guid conversationPublicId,
            IReadOnlyCollection<Guid> participantUserIds,
            ChatRealtimeMessageResponse message,
            CancellationToken cancellationToken = default);

        Task NotifyConversationReadAsync(
            Guid conversationPublicId,
            Guid userId,
            int? lastReadMessageId,
            CancellationToken cancellationToken = default);

        Task NotifyParticipantsChangedAsync(
            Guid conversationPublicId,
            IReadOnlyCollection<Guid> affectedUserIds,
            string action,
            CancellationToken cancellationToken = default);
    }
}
