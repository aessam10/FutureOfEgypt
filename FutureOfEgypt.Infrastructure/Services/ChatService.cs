using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.Chat;
using FutureOfEgypt.Domain;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Identity;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class ChatService : IChatService
    {
        private readonly AppDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IChatRealtimeNotifier _realtimeNotifier;
        public ChatService(
            AppDbContext context,
            UserManager<ApplicationUser> userManager,
            IChatRealtimeNotifier realtimeNotifier)
        {
            _context = context;
            _userManager = userManager;
            _realtimeNotifier = realtimeNotifier;
        }
        public async Task<PagedResponse<ChatUserSearchResponse>> SearchUsersAsync(
    Guid currentUserId,
    string? search,
    int pageNumber,
    int pageSize,
    CancellationToken cancellationToken = default)
        {
            pageNumber = pageNumber <= 0 ? 1 : pageNumber;
            pageSize = pageSize <= 0 ? 20 : pageSize;
            pageSize = pageSize > 100 ? 100 : pageSize;

            var query = _userManager.Users
                .AsNoTracking()
                .Where(x => x.Id != currentUserId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim().ToLower();

                query = query.Where(x =>
                    (x.FullName != null && x.FullName.ToLower().Contains(normalizedSearch)) ||
                    (x.UserName != null && x.UserName.ToLower().Contains(normalizedSearch)) ||
                    (x.Email != null && x.Email.ToLower().Contains(normalizedSearch)));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var users = await query
                .OrderBy(x => x.FullName)
                .ThenBy(x => x.Email)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new ChatUserSearchResponse
                {
                    UserId = x.Id,
                    DisplayName =
                        !string.IsNullOrWhiteSpace(x.FullName)
                            ? x.FullName
                            : !string.IsNullOrWhiteSpace(x.UserName)
                                ? x.UserName
                                : x.Email ?? x.Id.ToString(),
                    Email = x.Email
                })
                .ToListAsync(cancellationToken);

            return new PagedResponse<ChatUserSearchResponse>
            {
                Items = users,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }

        public async Task AddParticipantsAsync(
    Guid currentUserId,
    Guid conversationPublicId,
    AddChatParticipantsRequest request,
    CancellationToken cancellationToken = default)
        {
            if (request.UserIds is null || request.UserIds.Count == 0)
                throw new InvalidOperationException("At least one user is required.");

            var conversation = await _context.ChatConversations
                .Include(x => x.Participants)
                .FirstOrDefaultAsync(x =>
                    x.PublicId == conversationPublicId &&
                    !x.IsDeleted,
                    cancellationToken);

            if (conversation is null)
                throw new InvalidOperationException("Conversation does not exist.");

            if (conversation.Type != ChatConversationType.Group)
                throw new InvalidOperationException("Participants can only be added to group conversations.");

            var currentParticipant = conversation.Participants.FirstOrDefault(x =>
                x.UserId == currentUserId &&
                !x.IsDeleted &&
                x.LeftAtUtc == null);

            if (currentParticipant is null)
                throw new InvalidOperationException("You are not a participant in this conversation.");

            if (currentParticipant.Role != ChatParticipantRole.Owner &&
                currentParticipant.Role != ChatParticipantRole.Admin)
                throw new InvalidOperationException("Only group owners or admins can add participants.");

            var userIds = request.UserIds
                .Where(x => x != Guid.Empty)
                .Distinct()
                .ToList();

            if (userIds.Count == 0)
                throw new InvalidOperationException("At least one valid user is required.");

            foreach (var userId in userIds)
                await EnsureUserExistsAsync(userId, cancellationToken);

            var now = DateTime.UtcNow;
            var addedUserIds = new List<Guid>();

            foreach (var userId in userIds)
            {
                var existingParticipant = conversation.Participants
                    .FirstOrDefault(x => x.UserId == userId);

                if (existingParticipant is not null)
                {
                    if (existingParticipant.IsDeleted || existingParticipant.LeftAtUtc is not null)
                    {
                        existingParticipant.IsDeleted = false;
                        existingParticipant.LeftAtUtc = null;
                        existingParticipant.JoinedAtUtc = now;
                        existingParticipant.UpdatedAt = now;
                        existingParticipant.Role = ChatParticipantRole.Member;

                        addedUserIds.Add(userId);
                    }

                    continue;
                }

                conversation.Participants.Add(new ChatParticipant
                {
                    UserId = userId,
                    Role = ChatParticipantRole.Member,
                    JoinedAtUtc = now
                });

                addedUserIds.Add(userId);
            }

            if (addedUserIds.Count == 0)
                return;

            conversation.UpdatedAt = now;

            await _context.SaveChangesAsync(cancellationToken);

            await _realtimeNotifier.NotifyParticipantsChangedAsync(
                conversation.PublicId,
                addedUserIds,
                "added",
                cancellationToken);
        }
        public async Task RemoveParticipantAsync(
    Guid currentUserId,
    Guid conversationPublicId,
    Guid targetUserId,
    CancellationToken cancellationToken = default)
        {
            if (targetUserId == Guid.Empty)
                throw new InvalidOperationException("Target user is required.");

            var conversation = await _context.ChatConversations
                .Include(x => x.Participants)
                .FirstOrDefaultAsync(x =>
                    x.PublicId == conversationPublicId &&
                    !x.IsDeleted,
                    cancellationToken);

            if (conversation is null)
                throw new InvalidOperationException("Conversation does not exist.");

            if (conversation.Type != ChatConversationType.Group)
                throw new InvalidOperationException("Participants can only be removed from group conversations.");

            var currentParticipant = conversation.Participants.FirstOrDefault(x =>
                x.UserId == currentUserId &&
                !x.IsDeleted &&
                x.LeftAtUtc == null);

            if (currentParticipant is null)
                throw new InvalidOperationException("You are not a participant in this conversation.");

            if (currentParticipant.Role != ChatParticipantRole.Owner &&
                currentParticipant.Role != ChatParticipantRole.Admin)
                throw new InvalidOperationException("Only group owners or admins can remove participants.");

            var targetParticipant = conversation.Participants.FirstOrDefault(x =>
                x.UserId == targetUserId &&
                !x.IsDeleted &&
                x.LeftAtUtc == null);

            if (targetParticipant is null)
                throw new InvalidOperationException("Target user is not an active participant.");

            if (targetParticipant.Role == ChatParticipantRole.Owner)
                throw new InvalidOperationException("Group owner cannot be removed.");

            var now = DateTime.UtcNow;

            targetParticipant.LeftAtUtc = now;
            targetParticipant.UpdatedAt = now;
            conversation.UpdatedAt = now;

            await _context.SaveChangesAsync(cancellationToken);

            await _realtimeNotifier.NotifyParticipantsChangedAsync(
                conversation.PublicId,
                new List<Guid> { targetUserId },
                "removed",
                cancellationToken);
        }

        public async Task<PagedResponse<ChatConversationResponse>> GetMyConversationsAsync(
            Guid currentUserId,
            int pageNumber,
            int pageSize,
            string? search,
            CancellationToken cancellationToken = default)
        {
            pageNumber = pageNumber <= 0 ? 1 : pageNumber;
            pageSize = pageSize <= 0 ? 20 : pageSize;
            pageSize = pageSize > 100 ? 100 : pageSize;

            var query = _context.ChatConversations
                .AsNoTracking()
                .Include(x => x.Participants.Where(p => !p.IsDeleted && p.LeftAtUtc == null))
                .Where(x => !x.IsDeleted)
                .Where(x => x.Participants.Any(p =>
                    p.UserId == currentUserId &&
                    !p.IsDeleted &&
                    p.LeftAtUtc == null));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim().ToLower();

                query = query.Where(x =>
                    (x.Title != null && x.Title.ToLower().Contains(normalizedSearch)));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var conversations = await query
                .OrderByDescending(x => x.LastMessageAtUtc)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            var items = new List<ChatConversationResponse>();

            foreach (var conversation in conversations)
            {
                items.Add(await MapConversationAsync(conversation, currentUserId, cancellationToken));
            }

            return new PagedResponse<ChatConversationResponse>
            {
                Items = items,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<ChatConversationResponse> CreateDirectConversationAsync(
            Guid currentUserId,
            CreateDirectChatRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request.TargetUserId == Guid.Empty)
                throw new InvalidOperationException("Target user is required.");

            if (request.TargetUserId == currentUserId)
                throw new InvalidOperationException("You cannot create a direct chat with yourself.");

            await EnsureUserExistsAsync(currentUserId, cancellationToken);
            await EnsureUserExistsAsync(request.TargetUserId, cancellationToken);

            var existingConversation = await _context.ChatConversations
                .Include(x => x.Participants)
                .Where(x => !x.IsDeleted && x.Type == ChatConversationType.Direct)
                .Where(x => x.Participants.Count(p => !p.IsDeleted && p.LeftAtUtc == null) == 2)
                .Where(x => x.Participants.Any(p =>
                    p.UserId == currentUserId &&
                    !p.IsDeleted &&
                    p.LeftAtUtc == null))
                .Where(x => x.Participants.Any(p =>
                    p.UserId == request.TargetUserId &&
                    !p.IsDeleted &&
                    p.LeftAtUtc == null))
                .FirstOrDefaultAsync(cancellationToken);

            if (existingConversation is not null)
                return await MapConversationAsync(existingConversation, currentUserId, cancellationToken);

            var conversation = new ChatConversation
            {
                Type = ChatConversationType.Direct,
                CreatedByUserId = currentUserId,
                LastMessageAtUtc = DateTime.UtcNow
            };

            conversation.Participants.Add(new ChatParticipant
            {
                UserId = currentUserId,
                Role = ChatParticipantRole.Member
            });

            conversation.Participants.Add(new ChatParticipant
            {
                UserId = request.TargetUserId,
                Role = ChatParticipantRole.Member
            });

            _context.ChatConversations.Add(conversation);
            await _context.SaveChangesAsync(cancellationToken);

            return await MapConversationAsync(conversation, currentUserId, cancellationToken);
        }

        public async Task<ChatConversationResponse> CreateGroupConversationAsync(
            Guid currentUserId,
            CreateGroupChatRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new InvalidOperationException("Group title is required.");

            var participantUserIds = request.ParticipantUserIds
                .Where(x => x != Guid.Empty)
                .Distinct()
                .Where(x => x != currentUserId)
                .ToList();

            if (participantUserIds.Count == 0)
                throw new InvalidOperationException("At least one participant is required.");

            await EnsureUserExistsAsync(currentUserId, cancellationToken);

            foreach (var userId in participantUserIds)
                await EnsureUserExistsAsync(userId, cancellationToken);

            var conversation = new ChatConversation
            {
                Title = request.Title.Trim(),
                Type = ChatConversationType.Group,
                CreatedByUserId = currentUserId,
                LastMessageAtUtc = DateTime.UtcNow
            };

            conversation.Participants.Add(new ChatParticipant
            {
                UserId = currentUserId,
                Role = ChatParticipantRole.Owner
            });

            foreach (var userId in participantUserIds)
            {
                conversation.Participants.Add(new ChatParticipant
                {
                    UserId = userId,
                    Role = ChatParticipantRole.Member
                });
            }

            _context.ChatConversations.Add(conversation);
            await _context.SaveChangesAsync(cancellationToken);

            return await MapConversationAsync(conversation, currentUserId, cancellationToken);
        }

        public async Task<PagedResponse<ChatMessageResponse>> GetMessagesAsync(
            Guid currentUserId,
            Guid conversationPublicId,
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            pageNumber = pageNumber <= 0 ? 1 : pageNumber;
            pageSize = pageSize <= 0 ? 50 : pageSize;
            pageSize = pageSize > 100 ? 100 : pageSize;

            var conversation = await GetConversationForUserAsync(
                currentUserId,
                conversationPublicId,
                cancellationToken);

            var query = _context.ChatMessages
                .AsNoTracking()
                .Where(x =>
                    x.ConversationId == conversation.Id &&
                    !x.IsDeleted &&
                    x.DeletedAtUtc == null);

            var totalCount = await query.CountAsync(cancellationToken);

            var messages = await query
                .OrderByDescending(x => x.Id)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .OrderBy(x => x.Id)
                .ToListAsync(cancellationToken);

            var senderIds = messages.Select(x => x.SenderUserId).Distinct().ToList();
            var users = await GetUserDisplayMapAsync(senderIds, cancellationToken);

            var items = messages.Select(message => new ChatMessageResponse
            {
                PublicId = message.PublicId,
                SenderUserId = message.SenderUserId,
                SenderName = GetDisplayName(users, message.SenderUserId),
                MessageText = message.MessageText,
                Type = (int)message.Type,
                SentAtUtc = message.SentAtUtc,
                IsMine = message.SenderUserId == currentUserId
            }).ToList();

            return new PagedResponse<ChatMessageResponse>
            {
                Items = items,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<ChatMessageResponse> SendMessageAsync(
            Guid currentUserId,
            Guid conversationPublicId,
            SendChatMessageRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.MessageText))
                throw new InvalidOperationException("Message text is required.");

            var messageText = request.MessageText.Trim();

            if (messageText.Length > 4000)
                throw new InvalidOperationException("Message text cannot exceed 4000 characters.");

            var conversation = await GetConversationForUserAsync(
                currentUserId,
                conversationPublicId,
                cancellationToken);

            var now = DateTime.UtcNow;

            var message = new ChatMessage
            {
                ConversationId = conversation.Id,
                SenderUserId = currentUserId,
                MessageText = messageText,
                Type = ChatMessageType.Text,
                SentAtUtc = now
            };

            conversation.LastMessageAtUtc = now;
            conversation.UpdatedAt = now;

            _context.ChatMessages.Add(message);

            await _context.SaveChangesAsync(cancellationToken);

            var senderParticipant = await _context.ChatParticipants
                .FirstOrDefaultAsync(x =>
                    x.ConversationId == conversation.Id &&
                    x.UserId == currentUserId &&
                    !x.IsDeleted &&
                    x.LeftAtUtc == null,
                    cancellationToken);

            if (senderParticipant is not null)
            {
                senderParticipant.LastReadMessageId = message.Id;
                senderParticipant.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);
            }

            var users = await GetUserDisplayMapAsync(
                new List<Guid> { currentUserId },
                cancellationToken);

            var senderName = GetDisplayName(users, message.SenderUserId);

            var response = new ChatMessageResponse
            {
                PublicId = message.PublicId,
                SenderUserId = message.SenderUserId,
                SenderName = senderName,
                MessageText = message.MessageText,
                Type = (int)message.Type,
                SentAtUtc = message.SentAtUtc,
                IsMine = true
            };

            var realtimeResponse = new ChatRealtimeMessageResponse
            {
                PublicId = message.PublicId,
                ConversationPublicId = conversation.PublicId,
                SenderUserId = message.SenderUserId,
                SenderName = senderName,
                MessageText = message.MessageText,
                Type = (int)message.Type,
                SentAtUtc = message.SentAtUtc
            };

            var participantUserIds = conversation.Participants
                .Where(x => !x.IsDeleted && x.LeftAtUtc == null)
                .Select(x => x.UserId)
                .Distinct()
                .ToList();

            await _realtimeNotifier.NotifyMessageSentAsync(
                conversation.PublicId,
                participantUserIds,
                realtimeResponse,
                cancellationToken);

            return response;
        }

        public async Task MarkAsReadAsync(
            Guid currentUserId,
            Guid conversationPublicId,
            CancellationToken cancellationToken = default)
        {
            var conversation = await GetConversationForUserAsync(
                currentUserId,
                conversationPublicId,
                cancellationToken);

            var participant = await _context.ChatParticipants
                .FirstOrDefaultAsync(x =>
                    x.ConversationId == conversation.Id &&
                    x.UserId == currentUserId &&
                    !x.IsDeleted &&
                    x.LeftAtUtc == null,
                    cancellationToken);

            if (participant is null)
                throw new InvalidOperationException("You are not a participant in this conversation.");

            var lastMessageId = await _context.ChatMessages
                .Where(x =>
                    x.ConversationId == conversation.Id &&
                    !x.IsDeleted &&
                    x.DeletedAtUtc == null)
                .OrderByDescending(x => x.Id)
                .Select(x => (int?)x.Id)
                .FirstOrDefaultAsync(cancellationToken);

            participant.LastReadMessageId = lastMessageId;
            participant.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            await _realtimeNotifier.NotifyConversationReadAsync(
    conversation.PublicId,
    currentUserId,
    lastMessageId,
    cancellationToken);
        }

        private async Task<ChatConversation> GetConversationForUserAsync(
            Guid currentUserId,
            Guid conversationPublicId,
            CancellationToken cancellationToken)
        {
            var conversation = await _context.ChatConversations
                .Include(x => x.Participants)
                .FirstOrDefaultAsync(x =>
                    x.PublicId == conversationPublicId &&
                    !x.IsDeleted,
                    cancellationToken);

            if (conversation is null)
                throw new InvalidOperationException("Conversation does not exist.");

            var isParticipant = conversation.Participants.Any(x =>
                x.UserId == currentUserId &&
                !x.IsDeleted &&
                x.LeftAtUtc == null);

            if (!isParticipant)
                throw new InvalidOperationException("You are not a participant in this conversation.");

            return conversation;
        }

        private async Task EnsureUserExistsAsync(Guid userId, CancellationToken cancellationToken)
        {
            var exists = await _userManager.Users
                .AnyAsync(x => x.Id == userId, cancellationToken);

            if (!exists)
                throw new InvalidOperationException("User does not exist.");
        }

        private async Task<ChatConversationResponse> MapConversationAsync(
            ChatConversation conversation,
            Guid currentUserId,
            CancellationToken cancellationToken)
        {
            var activeParticipants = conversation.Participants
                .Where(x => !x.IsDeleted && x.LeftAtUtc == null)
                .ToList();

            var participantIds = activeParticipants
                .Select(x => x.UserId)
                .Distinct()
                .ToList();

            var users = await GetUserDisplayMapAsync(participantIds, cancellationToken);

            var currentParticipant = activeParticipants
                .FirstOrDefault(x => x.UserId == currentUserId);

            var lastReadMessageId = currentParticipant?.LastReadMessageId ?? 0;

            var unreadCount = await _context.ChatMessages
                .AsNoTracking()
                .CountAsync(x =>
                    x.ConversationId == conversation.Id &&
                    !x.IsDeleted &&
                    x.DeletedAtUtc == null &&
                    x.SenderUserId != currentUserId &&
                    x.Id > lastReadMessageId,
                    cancellationToken);

            var lastMessage = await _context.ChatMessages
                .AsNoTracking()
                .Where(x =>
                    x.ConversationId == conversation.Id &&
                    !x.IsDeleted &&
                    x.DeletedAtUtc == null)
                .OrderByDescending(x => x.Id)
                .FirstOrDefaultAsync(cancellationToken);

            ChatMessagePreviewResponse? lastMessageResponse = null;

            if (lastMessage is not null)
            {
                if (!users.ContainsKey(lastMessage.SenderUserId))
                {
                    var senderMap = await GetUserDisplayMapAsync(
                        new List<Guid> { lastMessage.SenderUserId },
                        cancellationToken);

                    foreach (var item in senderMap)
                        users[item.Key] = item.Value;
                }

                lastMessageResponse = new ChatMessagePreviewResponse
                {
                    PublicId = lastMessage.PublicId,
                    SenderUserId = lastMessage.SenderUserId,
                    SenderName = GetDisplayName(users, lastMessage.SenderUserId),
                    MessageText = lastMessage.MessageText,
                    SentAtUtc = lastMessage.SentAtUtc
                };
            }

            return new ChatConversationResponse
            {
                PublicId = conversation.PublicId,
                Title = conversation.Title,
                Type = (int)conversation.Type,
                LastMessageAtUtc = conversation.LastMessageAtUtc,
                UnreadCount = unreadCount,
                LastMessage = lastMessageResponse,
                Participants = activeParticipants.Select(participant => new ChatParticipantResponse
                {
                    UserId = participant.UserId,
                    DisplayName = GetDisplayName(users, participant.UserId),
                    Email = users.TryGetValue(participant.UserId, out var userInfo) ? userInfo.Email : null,
                    Role = (int)participant.Role
                }).ToList()
            };
        }

        private async Task<Dictionary<Guid, UserDisplayInfo>> GetUserDisplayMapAsync(
            List<Guid> userIds,
            CancellationToken cancellationToken)
        {
            var distinctIds = userIds.Distinct().ToList();

            var users = await _userManager.Users
                .Where(x => distinctIds.Contains(x.Id))
                .Select(x => new UserDisplayInfo
                {
                    UserId = x.Id,
                    DisplayName =
                        !string.IsNullOrWhiteSpace(x.FullName)
                            ? x.FullName
                            : !string.IsNullOrWhiteSpace(x.UserName)
                                ? x.UserName
                                : x.Email ?? x.Id.ToString(),
                    Email = x.Email
                })
                .ToListAsync(cancellationToken);

            return users.ToDictionary(x => x.UserId, x => x);
        }

        private static string GetDisplayName(
            Dictionary<Guid, UserDisplayInfo> users,
            Guid userId)
        {
            return users.TryGetValue(userId, out var user)
                ? user.DisplayName
                : userId.ToString();
        }

        private sealed class UserDisplayInfo
        {
            public Guid UserId { get; set; }

            public string DisplayName { get; set; } = string.Empty;

            public string? Email { get; set; }
        }
    }
}
