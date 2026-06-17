namespace FutureOfEgypt.Application.Features.Tracking
{
    public interface ILocationNotifier
    {
        Task NotifyLocationReceivedAsync(
            LocationNotificationResponse location,
            CancellationToken cancellationToken = default);
    }
}
