using System.Threading;
using System.Threading.Tasks;
using FutureOfEgypt.Application.DTOs;
using FutureOfEgypt.Application.Features.Notifications;
using FutureOfEgypt.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace FutureOfEgypt.Services
{
    public class SignalRNotificationNotifier : INotificationRealtimeNotifier
    {
        private readonly IHubContext<NotificationHub> _hubContext;

        public SignalRNotificationNotifier(IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendNotificationAsync(NotificationDto notification, CancellationToken cancellationToken = default)
        {
            await _hubContext.Clients.Group("Admins").SendAsync("ReceiveNotification", notification, cancellationToken);
        }
    }
}
