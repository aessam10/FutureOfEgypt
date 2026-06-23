using System.Security.Cryptography;
using FutureOfEgypt.Application.Features.AppUpdates;

namespace FutureOfEgypt.Services
{
    public class AppReleaseFileService : IAppReleaseFileService
    {
        private readonly string _baseDirectory;
        private readonly IConfiguration _configuration;

        public AppReleaseFileService(IWebHostEnvironment env, IConfiguration configuration)
        {
            _configuration = configuration;
            var configPath = configuration["AppStorage:AndroidReleasesPath"];
            if (!string.IsNullOrWhiteSpace(configPath))
            {
                _baseDirectory = configPath;
            }
            else
            {
                // E.g., C:\Users\BackUp\source\repos\FutureOfEgypt\FutureOfEgypt\AppFiles\AndroidReleases\
                _baseDirectory = Path.Combine(env.ContentRootPath, "AppFiles", "AndroidReleases");
            }
            
            if (!Directory.Exists(_baseDirectory))
            {
                Directory.CreateDirectory(_baseDirectory);
            }
        }

        public string GetApkPath(string fileName)
        {
            // Prevent directory traversal attacks
            var cleanFileName = Path.GetFileName(fileName);
            return Path.Combine(_baseDirectory, cleanFileName);
        }

        public bool FileExists(string fileName)
        {
            return File.Exists(GetApkPath(fileName));
        }

        public string ComputeSha256(string fileName)
        {
            var filePath = GetApkPath(fileName);
            if (!File.Exists(filePath))
                throw new FileNotFoundException($"APK file not found: {fileName}");

            using var sha256 = SHA256.Create();
            using var stream = File.OpenRead(filePath);
            var hashBytes = sha256.ComputeHash(stream);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        }

        public long GetFileSize(string fileName)
        {
            var filePath = GetApkPath(fileName);
            if (!File.Exists(filePath))
                return 0;

            var fileInfo = new FileInfo(filePath);
            return fileInfo.Length;
        }

        public string GetDownloadUrl(Guid releasePublicId, string requestScheme, string requestHost)
        {
            var isPublicBaseUrlEnabled = _configuration.GetValue<bool>("PublicBaseUrl:Enabled");
            if (isPublicBaseUrlEnabled)
            {
                var baseUrl = _configuration.GetValue<string>("PublicBaseUrl:BaseUrl");
                if (!string.IsNullOrWhiteSpace(baseUrl))
                {
                    return $"{baseUrl.TrimEnd('/')}/api/app-updates/android/download/{releasePublicId}";
                }
            }

            // e.g. https://domain.com/api/app-updates/android/download/{guid}
            return $"{requestScheme}://{requestHost}/api/app-updates/android/download/{releasePublicId}";
        }

        public async Task SaveApkAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default)
        {
            var filePath = GetApkPath(fileName);
            using var fileStreamOut = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None);
            await fileStream.CopyToAsync(fileStreamOut, cancellationToken);
        }
    }
}
