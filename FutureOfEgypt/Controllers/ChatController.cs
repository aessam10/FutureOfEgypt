using FutureOfEgypt.Application.Features.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public sealed class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;

        public ChatController(IChatService chatService)
        {
            _chatService = chatService;
        }
        [HttpGet("users")]
        public async Task<IActionResult> SearchUsers(
    [FromQuery] string? search = null,
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 20,
    CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            var result = await _chatService.SearchUsersAsync(
                currentUserId,
                search,
                pageNumber,
                pageSize,
                cancellationToken);

            return Ok(result);
        }

        [HttpPost("conversations/{conversationPublicId:guid}/participants")]
        public async Task<IActionResult> AddParticipants(
            Guid conversationPublicId,
            [FromBody] AddChatParticipantsRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            await _chatService.AddParticipantsAsync(
                currentUserId,
                conversationPublicId,
                request,
                cancellationToken);

            return NoContent();
        }

        [HttpDelete("conversations/{conversationPublicId:guid}/participants/{targetUserId:guid}")]
        public async Task<IActionResult> RemoveParticipant(
            Guid conversationPublicId,
            Guid targetUserId,
            CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            await _chatService.RemoveParticipantAsync(
                currentUserId,
                conversationPublicId,
                targetUserId,
                cancellationToken);

            return NoContent();
        }

        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 20,
            [FromQuery] string? search = null,
            [FromQuery] bool archived = false,
            CancellationToken cancellationToken = default)
        {
            var result = await _chatService.GetMyConversationsAsync(GetCurrentUserId(), page, limit, search, archived, cancellationToken);
            return Ok(result);
        }

        [HttpPost("conversations/{conversationPublicId}/mute")]
        public async Task<IActionResult> MuteConversation(
            [FromRoute] Guid conversationPublicId,
            [FromBody] MuteConversationRequest? request,
            CancellationToken cancellationToken = default)
        {
            var result = await _chatService.MuteConversationAsync(GetCurrentUserId(), conversationPublicId, request?.MutedUntilUtc, cancellationToken);
            return Ok(result);
        }

        [HttpPost("conversations/{conversationPublicId}/unmute")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ChatConversationResponse))]
        public async Task<IActionResult> UnmuteConversation(
            [FromRoute] Guid conversationPublicId,
            CancellationToken cancellationToken = default)
        {
            var result = await _chatService.UnmuteConversationAsync(GetCurrentUserId(), conversationPublicId, cancellationToken);
            return Ok(result);
        }

        [HttpPost("conversations/{conversationPublicId}/archive")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ChatConversationResponse))]
        public async Task<IActionResult> ArchiveConversation(
            [FromRoute] Guid conversationPublicId,
            CancellationToken cancellationToken = default)
        {
            var result = await _chatService.ArchiveConversationAsync(GetCurrentUserId(), conversationPublicId, cancellationToken);
            return Ok(result);
        }

        [HttpPost("conversations/{conversationPublicId}/unarchive")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ChatConversationResponse))]
        public async Task<IActionResult> UnarchiveConversation(
            [FromRoute] Guid conversationPublicId,
            CancellationToken cancellationToken = default)
        {
            var result = await _chatService.UnarchiveConversationAsync(GetCurrentUserId(), conversationPublicId, cancellationToken);
            return Ok(result);
        }

        [HttpGet("conversations/{conversationPublicId:guid}")]
        public async Task<IActionResult> GetConversation(
            Guid conversationPublicId,
            CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            var result = await _chatService.GetConversationAsync(
                currentUserId,
                conversationPublicId,
                cancellationToken);

            return Ok(result);
        }

        [HttpPost("conversations/direct")]
        public async Task<IActionResult> CreateDirectConversation(
            [FromBody] CreateDirectChatRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            var result = await _chatService.CreateDirectConversationAsync(
                currentUserId,
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpPost("conversations/group")]
        public async Task<IActionResult> CreateGroupConversation(
            [FromBody] CreateGroupChatRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            var result = await _chatService.CreateGroupConversationAsync(
                currentUserId,
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpGet("conversations/{conversationPublicId:guid}/messages")]
        public async Task<IActionResult> GetMessages(
            Guid conversationPublicId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 50,
            CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            var result = await _chatService.GetMessagesAsync(
                currentUserId,
                conversationPublicId,
                pageNumber,
                pageSize,
                cancellationToken);

            return Ok(result);
        }

        [HttpPost("conversations/{conversationPublicId:guid}/messages")]
        public async Task<IActionResult> SendMessage(
            Guid conversationPublicId,
            [FromBody] SendChatMessageRequest request,
            CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            var result = await _chatService.SendMessageAsync(
                currentUserId,
                conversationPublicId,
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpPost("conversations/{conversationPublicId:guid}/read")]
        public async Task<IActionResult> MarkAsRead(
            Guid conversationPublicId,
            CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();

            await _chatService.MarkAsReadAsync(
                currentUserId,
                conversationPublicId,
                cancellationToken);

            return NoContent();
        }

        private Guid GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub");

            if (string.IsNullOrWhiteSpace(userIdValue))
                throw new InvalidOperationException("User id claim is missing.");

            return Guid.Parse(userIdValue);
        }
    }

    public record MuteConversationRequest(DateTime? MutedUntilUtc);
}
