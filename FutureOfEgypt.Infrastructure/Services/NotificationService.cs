using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FutureOfEgypt.Application.Common;
using FutureOfEgypt.Application.DTOs;
using FutureOfEgypt.Application.Features.Notifications;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        private readonly INotificationRealtimeNotifier _notifier;

        public NotificationService(AppDbContext context, INotificationRealtimeNotifier notifier)
        {
            _context = context;
            _notifier = notifier;
        }

        public async Task<PaginatedResponse<NotificationDto>> GetNotificationsAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default)
        {
            try
            {
                var query = _context.AppNotifications.AsNoTracking();

                var totalCount = await query.CountAsync(cancellationToken);

                var items = await query
                    .OrderByDescending(n => n.CreatedAt)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .Select(n => new NotificationDto
                    {
                        Id = n.PublicId,
                        Title = n.Title,
                        Message = n.Message,
                        Type = n.Type,
                        IsRead = n.IsRead,
                        CreatedAtUtc = n.CreatedAt
                    })
                    .ToListAsync(cancellationToken);

                return new PaginatedResponse<NotificationDto>
                {
                    Items = items,
                    TotalCount = totalCount,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                };
            }
            catch (OperationCanceledException)
            {
                return new PaginatedResponse<NotificationDto>
                {
                    Items = new List<NotificationDto>(),
                    TotalCount = 0,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                };
            }
        }

        public async Task CreateAndSendNotificationAsync(string title, string message, string type, CancellationToken cancellationToken = default)
        {
            var notification = new AppNotification
            {
                Title = title,
                Message = message,
                Type = type,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.AppNotifications.Add(notification);
            await _context.SaveChangesAsync(cancellationToken);

            var dto = new NotificationDto
            {
                Id = notification.PublicId,
                Title = notification.Title,
                Message = notification.Message,
                Type = notification.Type,
                IsRead = notification.IsRead,
                CreatedAtUtc = notification.CreatedAt
            };

            await _notifier.SendNotificationAsync(dto, cancellationToken);
        }

        public async Task MarkAsReadAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var notification = await _context.AppNotifications.FirstOrDefaultAsync(n => n.PublicId == id, cancellationToken);
            if (notification != null && !notification.IsRead)
            {
                notification.IsRead = true;
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task MarkAllAsReadAsync(CancellationToken cancellationToken = default)
        {
            var unread = await _context.AppNotifications.Where(n => !n.IsRead).ToListAsync(cancellationToken);
            if (unread.Any())
            {
                foreach (var notif in unread)
                {
                    notif.IsRead = true;
                }
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        
        public async Task<int> GetUnreadCountAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                return await _context.AppNotifications.CountAsync(n => !n.IsRead, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                return 0;
            }
        }
    }
}
