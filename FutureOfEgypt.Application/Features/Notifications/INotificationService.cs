using System;
using System.Threading;
using System.Threading.Tasks;
using FutureOfEgypt.Application.Common;
using FutureOfEgypt.Application.DTOs;

namespace FutureOfEgypt.Application.Features.Notifications
{
    public interface INotificationService
    {
        Task<PaginatedResponse<NotificationDto>> GetNotificationsAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default);
        Task CreateAndSendNotificationAsync(string title, string message, string type, CancellationToken cancellationToken = default);
        Task MarkAsReadAsync(Guid id, CancellationToken cancellationToken = default);
        Task MarkAllAsReadAsync(CancellationToken cancellationToken = default);
        Task<int> GetUnreadCountAsync(CancellationToken cancellationToken = default);
    }
}
