using System.Threading;
using System.Threading.Tasks;
using FutureOfEgypt.Application.DTOs;

namespace FutureOfEgypt.Application.Features.Notifications
{
    public interface INotificationRealtimeNotifier
    {
        Task SendNotificationAsync(NotificationDto notification, CancellationToken cancellationToken = default);
    }
}
