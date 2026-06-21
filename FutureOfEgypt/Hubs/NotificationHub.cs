using FutureOfEgypt.Application.Common.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FutureOfEgypt.Hubs
{
    [Authorize(Policy = "AdminOrManager")]
    public sealed class NotificationHub : Hub
    {
        private const string ADMINS_GROUP_NAMES = "Admins";

        public override async Task OnConnectedAsync()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, ADMINS_GROUP_NAMES);

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, ADMINS_GROUP_NAMES);

            await base.OnDisconnectedAsync(exception);
        }
    }
}
