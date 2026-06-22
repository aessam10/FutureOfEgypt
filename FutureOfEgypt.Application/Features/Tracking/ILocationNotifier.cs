namespace FutureOfEgypt.Application.Features.Tracking
{
    public interface ILocationNotifier
    {
        Task NotifyLocationReceivedAsync(
            LocationNotificationResponse location,
            CancellationToken cancellationToken = default);

        Task NotifyLocationHiddenAsync(
            Guid devicePublicId,
            CancellationToken cancellationToken = default);

        Task NotifyLocationUnhiddenAsync(
            Guid devicePublicId,
            CancellationToken cancellationToken = default);
    }
}
