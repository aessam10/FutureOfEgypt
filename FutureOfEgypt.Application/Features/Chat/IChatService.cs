using FutureOfEgypt.Application.Common.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace FutureOfEgypt.Application.Features.Chat
{
    public interface IChatService
    {
        Task<PagedResponse<ChatConversationResponse>> GetMyConversationsAsync(
            Guid currentUserId,
            int pageNumber,
            int pageSize,
            string? search,
            CancellationToken cancellationToken = default);

        Task<ChatConversationResponse> CreateDirectConversationAsync(
            Guid currentUserId,
            CreateDirectChatRequest request,
            CancellationToken cancellationToken = default);

        Task<ChatConversationResponse> CreateGroupConversationAsync(
            Guid currentUserId,
            CreateGroupChatRequest request,
            CancellationToken cancellationToken = default);

        Task<PagedResponse<ChatMessageResponse>> GetMessagesAsync(
            Guid currentUserId,
            Guid conversationPublicId,
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<ChatMessageResponse> SendMessageAsync(
            Guid currentUserId,
            Guid conversationPublicId,
            SendChatMessageRequest request,
            CancellationToken cancellationToken = default);

        Task MarkAsReadAsync(
            Guid currentUserId,
            Guid conversationPublicId,
            CancellationToken cancellationToken = default);

        Task<PagedResponse<ChatUserSearchResponse>> SearchUsersAsync(
    Guid currentUserId,
    string? search,
    int pageNumber,
    int pageSize,
    CancellationToken cancellationToken = default);

        Task AddParticipantsAsync(
            Guid currentUserId,
            Guid conversationPublicId,
            AddChatParticipantsRequest request,
            CancellationToken cancellationToken = default);

        Task RemoveParticipantAsync(
            Guid currentUserId,
            Guid conversationPublicId,
            Guid targetUserId,
            CancellationToken cancellationToken = default);
    }
}
