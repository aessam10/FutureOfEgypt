namespace FutureOfEgypt.Application.Features.AppUpdates
{
    public interface IAppUpdateService
    {
        Task<AppUpdateCheckResponse> CheckUpdateAsync(string platform, int currentVersionCode, string requestScheme, string requestHost, CancellationToken cancellationToken = default);
        Task<AppReleaseAdminResponse> CreateReleaseAsync(CreateAppReleaseRequest request, string requestScheme, string requestHost, CancellationToken cancellationToken = default);
        Task<AppReleaseAdminResponse> UploadReleaseApkAsync(Guid publicId, Stream fileStream, string fileName, string requestScheme, string requestHost, CancellationToken cancellationToken = default);
        Task<AppReleaseAdminResponse> ActivateReleaseAsync(Guid publicId, CancellationToken cancellationToken = default);
        Task<bool> DeactivateReleaseAsync(Guid publicId, CancellationToken cancellationToken = default);
        Task<bool> DeleteReleaseAsync(Guid publicId, CancellationToken cancellationToken = default);
        Task<List<AppReleaseAdminResponse>> GetAllReleasesAsync(CancellationToken cancellationToken = default);
        Task<AppReleaseAdminResponse?> GetActiveReleaseCachedAsync(string platform, string requestScheme, string requestHost, CancellationToken cancellationToken = default);
        Task ReportAppStatusAsync(DeviceAppStatusRequest request, CancellationToken cancellationToken = default);
        Task<List<DeviceAppStatusAdminResponse>> GetAllDeviceStatusesAsync(CancellationToken cancellationToken = default);
    }
}
