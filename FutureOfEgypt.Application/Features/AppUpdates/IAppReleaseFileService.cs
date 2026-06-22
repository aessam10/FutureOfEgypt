namespace FutureOfEgypt.Application.Features.AppUpdates
{
    public interface IAppReleaseFileService
    {
        string GetApkPath(string fileName);
        bool FileExists(string fileName);
        string ComputeSha256(string fileName);
        long GetFileSize(string fileName);
        string GetDownloadUrl(Guid releasePublicId, string requestScheme, string requestHost);
        Task SaveApkAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default);
    }
}
