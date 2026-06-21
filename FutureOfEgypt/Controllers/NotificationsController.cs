using FutureOfEgypt.Application.Common;
using FutureOfEgypt.Application.DTOs;
using FutureOfEgypt.Application.Features.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "AdminOrManager")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<ActionResult<PaginatedResponse<NotificationDto>>> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken cancellationToken = default)
        {
            var result = await _notificationService.GetNotificationsAsync(page, pageSize, cancellationToken);
            return Ok(result);
        }

        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount(CancellationToken cancellationToken = default)
        {
            var count = await _notificationService.GetUnreadCountAsync(cancellationToken);
            return Ok(count);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken = default)
        {
            await _notificationService.MarkAsReadAsync(id, cancellationToken);
            return NoContent();
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken = default)
        {
            await _notificationService.MarkAllAsReadAsync(cancellationToken);
            return NoContent();
        }
    }
}
