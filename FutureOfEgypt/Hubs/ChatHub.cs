using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Text.RegularExpressions;
using FutureOfEgypt.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using FutureOfEgypt.Infrastructure.Persistence;

namespace FutureOfEgypt.Hubs
{
    [Authorize]
    public sealed class ChatHub : Hub
    {
        private readonly AppDbContext _context;

        public ChatHub(AppDbContext context)
        {
            _context = context;
        }

        public override async Task OnConnectedAsync()
        {
            var currentUserId = GetCurrentUserId();

            var user = await _context.Users
                .Include(u => u.Engineer)
                .Include(u => u.Manager)
                .Include(u => u.Admin)
                .FirstOrDefaultAsync(u => u.Id == currentUserId);

            if (user == null || user.IsDeleted || user.IsSuspended)
            {
                Context.Abort();
                return;
            }

            bool isAvailable = false;
            if (user.UserType == UserType.Engineer)
                isAvailable = user.Engineer != null && !user.Engineer.IsDeleted && user.Engineer.Status == EngineerStatus.Active;
            else if (user.UserType == UserType.Manager)
                isAvailable = user.Manager != null && !user.Manager.IsDeleted;
            else if (user.UserType == UserType.Admin)
                isAvailable = user.Admin != null && !user.Admin.IsDeleted;

            if (!isAvailable)
            {
                Context.Abort();
                return;
            }

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                GetUserGroupName(currentUserId));

            var conversationPublicIds = await _context.ChatParticipants
                .AsNoTracking()
                .Where(x =>
                    x.UserId == currentUserId &&
                    !x.IsDeleted &&
                    x.LeftAtUtc == null &&
                    !x.Conversation.IsDeleted)
                .Select(x => x.Conversation.PublicId)
                .ToListAsync();

            foreach (var conversationPublicId in conversationPublicIds)
            {
                await Groups.AddToGroupAsync(
                    Context.ConnectionId,
                    GetConversationGroupName(conversationPublicId));
            }

            await base.OnConnectedAsync();
        }

        public async Task JoinConversation(Guid conversationPublicId)
        {
            var currentUserId = GetCurrentUserId();

            var isParticipant = await _context.ChatParticipants
                .AsNoTracking()
                .AnyAsync(x =>
                    x.UserId == currentUserId &&
                    !x.IsDeleted &&
                    x.LeftAtUtc == null &&
                    x.Conversation.PublicId == conversationPublicId &&
                    !x.Conversation.IsDeleted);

            if (!isParticipant)
                throw new HubException("You are not a participant in this conversation.");

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                GetConversationGroupName(conversationPublicId));
        }

        public static string GetConversationGroupName(Guid conversationPublicId)
        {
            return $"chat-conversation-{conversationPublicId}";
        }

        public static string GetUserGroupName(Guid userId)
        {
            return $"chat-user-{userId}";
        }

        private Guid GetCurrentUserId()
        {
            var userIdValue =
                Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
                Context.User?.FindFirstValue("sub");

            if (string.IsNullOrWhiteSpace(userIdValue))
                throw new HubException("User id claim is missing.");

            return Guid.Parse(userIdValue);
        }
    }
}
