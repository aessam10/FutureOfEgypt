using FutureOfEgypt.Application.Features.Tracking;
using FutureOfEgypt.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace FutureOfEgypt.Services
{
    public sealed class SignalRLocationNotifier : ILocationNotifier
    {
        private const string AdminsGroupName = "Admins";

        private readonly IHubContext<LocationHub> _hubContext;

        public SignalRLocationNotifier(IHubContext<LocationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task NotifyLocationReceivedAsync(
            LocationNotificationResponse location,
            CancellationToken cancellationToken = default)
        {
            await _hubContext.Clients
                .Group(AdminsGroupName)
                .SendAsync(
                    "locationReceived",
                    location,
                    cancellationToken);
        }
        public async Task NotifyLocationHiddenAsync(
            Guid devicePublicId,
            CancellationToken cancellationToken = default)
        {
            await _hubContext.Clients
                .Group(AdminsGroupName)
                .SendAsync(
                    "locationHidden",
                    devicePublicId,
                    cancellationToken);
        }

        public async Task NotifyLocationUnhiddenAsync(
            Guid devicePublicId,
            CancellationToken cancellationToken = default)
        {
            await _hubContext.Clients
                .Group(AdminsGroupName)
                .SendAsync(
                    "locationUnhidden",
                    devicePublicId,
                    cancellationToken);
        }
    }
}