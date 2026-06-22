namespace FutureOfEgypt.Domain.Enums
{
    public enum AppUpdateStatus
    {
        Unknown = 0,
        UpToDate = 1,
        UpdateAvailable = 2,
        UpdateRecommended = 3,
        UpdateRequired = 4,
        MandatoryUpdateRequired = 5,
        UpdateStarted = 6,
        UpdateFailed = 7
    }
}
