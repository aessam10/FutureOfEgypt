using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using FutureOfEgypt.Application.Features.AppUpdates;
using Microsoft.Extensions.Caching.Memory;

namespace FutureOfEgypt.Infrastructure.Services
{
    public class AppUpdateService : IAppUpdateService
    {
        private readonly AppDbContext _context;
        private readonly IAppReleaseFileService _fileService;
        private readonly IMemoryCache _cache;

        public AppUpdateService(
            AppDbContext context,
            IAppReleaseFileService fileService,
            IMemoryCache cache)
        {
            _context = context;
            _fileService = fileService;
            _cache = cache;
        }

        public async Task<AppUpdateCheckResponse> CheckUpdateAsync(string platform, int currentVersionCode, string requestScheme, string requestHost, CancellationToken cancellationToken = default)
        {
            Console.WriteLine($"[FOE_BACKEND_DEBUG] CheckUpdateAsync requested - platform: {platform}, versionCode: {currentVersionCode}");

            // Try to get from cache first
            bool cacheHit = false;
            AppReleaseAdminResponse? activeRelease = null;
            
            if (string.Equals(platform, "Android", StringComparison.OrdinalIgnoreCase))
            {
                if (_cache.TryGetValue("ActiveAndroidAppReleaseThresholds", out AppReleaseAdminResponse? cachedRelease))
                {
                    cacheHit = true;
                    activeRelease = cachedRelease;
                }
            }

            if (!cacheHit)
            {
                activeRelease = await GetActiveReleaseCachedAsync(platform, requestScheme, requestHost, cancellationToken);
            }

            Console.WriteLine($"[FOE_BACKEND_DEBUG] Cache hit/miss: {(cacheHit ? "HIT" : "MISS")}");
            Console.WriteLine($"[FOE_BACKEND_DEBUG] Number of active releases found: {(activeRelease != null ? 1 : 0)}");

            var response = new AppUpdateCheckResponse
            {
                Platform = platform,
                CurrentVersionCode = currentVersionCode,
                UpdateLevel = AppUpdateLevel.None,
                IsUpdateAvailable = false,
                IsBlocking = false
            };

            if (activeRelease == null)
            {
                Console.WriteLine("[FOE_BACKEND_DEBUG] No active release found. Returning default response.");
                return response;
            }

            Console.WriteLine($"[FOE_BACKEND_DEBUG] Active release found - PublicId: {activeRelease.PublicId}, Platform: {activeRelease.Platform}, VersionCode: {activeRelease.VersionCode}, MinMandatory: {activeRelease.MinimumMandatoryVersionCode}");

            response.LatestVersionName = activeRelease.VersionName;
            response.LatestVersionCode = activeRelease.VersionCode;
            response.MinimumRecommendedVersionCode = activeRelease.MinimumRecommendedVersionCode;
            response.MinimumRequiredVersionCode = activeRelease.MinimumRequiredVersionCode;
            response.MinimumMandatoryVersionCode = activeRelease.MinimumMandatoryVersionCode;
            response.ApkSha256 = activeRelease.ApkSha256;
            response.FileSizeBytes = activeRelease.FileSizeBytes;
            response.ReleaseNotes = activeRelease.ReleaseNotes;

            if (!string.IsNullOrEmpty(requestScheme) && !string.IsNullOrEmpty(requestHost))
            {
                response.DownloadUrl = _fileService.GetDownloadUrl(Guid.Parse(activeRelease.PublicId), requestScheme, requestHost);
            }
            else
            {
                response.DownloadUrl = activeRelease.ApkDownloadUrl;
            }

            // Compute UpdateLevel dynamically
            if (currentVersionCode >= activeRelease.VersionCode)
            {
                response.UpdateLevel = AppUpdateLevel.None;
                response.IsUpdateAvailable = false;
                response.IsBlocking = false;
            }
            else if (activeRelease.MinimumMandatoryVersionCode.HasValue && currentVersionCode < activeRelease.MinimumMandatoryVersionCode.Value)
            {
                response.UpdateLevel = AppUpdateLevel.Mandatory;
                response.IsUpdateAvailable = true;
                response.IsBlocking = true;
            }
            else if (activeRelease.MinimumRequiredVersionCode.HasValue && currentVersionCode < activeRelease.MinimumRequiredVersionCode.Value)
            {
                response.UpdateLevel = AppUpdateLevel.Required;
                response.IsUpdateAvailable = true;
                response.IsBlocking = false;
            }
            else if (activeRelease.MinimumRecommendedVersionCode.HasValue && currentVersionCode < activeRelease.MinimumRecommendedVersionCode.Value)
            {
                response.UpdateLevel = AppUpdateLevel.Optional;
                response.IsUpdateAvailable = true;
                response.IsBlocking = false;
            }
            else if (currentVersionCode < activeRelease.VersionCode)
            {
                // Fallback: if there's a newer version but no thresholds hit, it's optional
                response.UpdateLevel = AppUpdateLevel.Optional;
                response.IsUpdateAvailable = true;
                response.IsBlocking = false;
            }

            return response;
        }

        public async Task<AppReleaseAdminResponse> CreateReleaseAsync(CreateAppReleaseRequest request, string requestScheme, string requestHost, CancellationToken cancellationToken = default)
        {
            if (!request.ApkFileName.EndsWith(".apk", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Only .apk files are allowed.");
            }

            // Validate threshold order
            int? prevThreshold = null;
            if (request.MinimumMandatoryVersionCode.HasValue)
            {
                prevThreshold = request.MinimumMandatoryVersionCode.Value;
            }
            if (request.MinimumRequiredVersionCode.HasValue)
            {
                if (prevThreshold.HasValue && request.MinimumRequiredVersionCode.Value < prevThreshold.Value)
                    throw new ArgumentException("MinimumRequiredVersionCode must be >= MinimumMandatoryVersionCode.");
                prevThreshold = request.MinimumRequiredVersionCode.Value;
            }
            if (request.MinimumRecommendedVersionCode.HasValue)
            {
                if (prevThreshold.HasValue && request.MinimumRecommendedVersionCode.Value < prevThreshold.Value)
                    throw new ArgumentException("MinimumRecommendedVersionCode must be >= MinimumRequiredVersionCode or MinimumMandatoryVersionCode.");
                prevThreshold = request.MinimumRecommendedVersionCode.Value;
            }
            if (prevThreshold.HasValue && request.VersionCode < prevThreshold.Value)
            {
                throw new ArgumentException("VersionCode must be >= MinimumRecommendedVersionCode, MinimumRequiredVersionCode, or MinimumMandatoryVersionCode.");
            }

            string sha256 = string.Empty;
            long size = 0;

            if (!string.IsNullOrEmpty(request.ApkFileName))
            {
                if (!_fileService.FileExists(request.ApkFileName))
                {
                    throw new FileNotFoundException($"APK file '{request.ApkFileName}' not found on server disk.");
                }

                sha256 = _fileService.ComputeSha256(request.ApkFileName);
                size = _fileService.GetFileSize(request.ApkFileName);
            }

            var release = new AppRelease
            {
                Platform = request.Platform,
                VersionName = request.VersionName,
                VersionCode = request.VersionCode,
                MinimumRecommendedVersionCode = request.MinimumRecommendedVersionCode,
                MinimumRequiredVersionCode = request.MinimumRequiredVersionCode,
                MinimumMandatoryVersionCode = request.MinimumMandatoryVersionCode,
                ApkFileName = request.ApkFileName,
                ApkSha256 = sha256,
                FileSizeBytes = size,
                ReleaseNotes = request.ReleaseNotes,
                IsActive = false, // Always inactive on creation
                PublishedAt = DateTime.UtcNow
            };

            if (!string.IsNullOrEmpty(requestScheme) && !string.IsNullOrEmpty(requestHost))
            {
                release.ApkDownloadUrl = _fileService.GetDownloadUrl(release.PublicId, requestScheme, requestHost);
            }
            else
            {
                release.ApkDownloadUrl = string.Empty;
            }

            _context.AppReleases.Add(release);
            await _context.SaveChangesAsync(cancellationToken);

            if (string.Equals(release.Platform, "Android", StringComparison.OrdinalIgnoreCase))
            {
                _cache.Remove("ActiveAndroidAppReleaseThresholds");
            }

            return MapToAdminResponse(release);
        }

        public async Task<AppReleaseAdminResponse> ActivateReleaseAsync(Guid publicId, CancellationToken cancellationToken = default)
        {
            var releaseToActivate = await _context.AppReleases
                .FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted, cancellationToken);

            if (releaseToActivate == null)
            {
                throw new KeyNotFoundException($"Release with PublicId {publicId} not found.");
            }

            if (string.IsNullOrEmpty(releaseToActivate.ApkFileName) || 
                releaseToActivate.FileSizeBytes <= 0 || 
                string.IsNullOrEmpty(releaseToActivate.ApkSha256) || 
                !_fileService.FileExists(releaseToActivate.ApkFileName))
            {
                throw new InvalidOperationException("Upload APK before activating this release.");
            }

            // Deactivate all others for same platform
            var activeReleases = await _context.AppReleases
                .Where(x => x.Platform.ToLower() == releaseToActivate.Platform.ToLower() && x.IsActive && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var r in activeReleases)
            {
                r.IsActive = false;
                r.UpdatedAt = DateTime.UtcNow;
            }

            releaseToActivate.IsActive = true;
            releaseToActivate.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            if (string.Equals(releaseToActivate.Platform, "Android", StringComparison.OrdinalIgnoreCase))
            {
                _cache.Remove("ActiveAndroidAppReleaseThresholds");
            }

            return MapToAdminResponse(releaseToActivate);
        }

        public async Task<AppReleaseAdminResponse> UploadReleaseApkAsync(Guid publicId, Stream fileStream, string fileName, string requestScheme, string requestHost, CancellationToken cancellationToken = default)
        {
            var release = await _context.AppReleases
                .FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted, cancellationToken);

            if (release == null)
            {
                throw new KeyNotFoundException($"Release with PublicId {publicId} not found.");
            }

            await _fileService.SaveApkAsync(fileStream, fileName, cancellationToken);

            release.ApkFileName = fileName;
            release.ApkSha256 = _fileService.ComputeSha256(fileName);
            release.FileSizeBytes = _fileService.GetFileSize(fileName);
            release.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(requestScheme) && !string.IsNullOrEmpty(requestHost))
            {
                release.ApkDownloadUrl = _fileService.GetDownloadUrl(release.PublicId, requestScheme, requestHost);
            }

            await _context.SaveChangesAsync(cancellationToken);

            if (release.IsActive && string.Equals(release.Platform, "Android", StringComparison.OrdinalIgnoreCase))
            {
                _cache.Remove("ActiveAndroidAppReleaseThresholds");
            }

            return MapToAdminResponse(release);
        }

        public async Task<bool> DeactivateReleaseAsync(Guid publicId, CancellationToken cancellationToken = default)
        {
            var release = await _context.AppReleases
                .FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted, cancellationToken);

            if (release == null)
            {
                return false;
            }

            release.IsActive = false;
            release.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            if (string.Equals(release.Platform, "Android", StringComparison.OrdinalIgnoreCase))
            {
                _cache.Remove("ActiveAndroidAppReleaseThresholds");
            }

            return true;
        }

        public async Task<bool> DeleteReleaseAsync(Guid publicId, CancellationToken cancellationToken = default)
        {
            var release = await _context.AppReleases
                .FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted, cancellationToken);

            if (release == null)
            {
                return false;
            }

            release.IsDeleted = true;
            release.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            if (string.Equals(release.Platform, "Android", StringComparison.OrdinalIgnoreCase) && release.IsActive)
            {
                _cache.Remove("ActiveAndroidAppReleaseThresholds");
            }

            return true;
        }

        public async Task<AppReleaseAdminResponse?> GetActiveReleaseCachedAsync(string platform, string requestScheme, string requestHost, CancellationToken cancellationToken = default)
        {
            if (!string.Equals(platform, "Android", StringComparison.OrdinalIgnoreCase))
            {
                // No caching implemented for non-Android platforms yet
                var activeRelease = await _context.AppReleases
                    .AsNoTracking()
                    .Where(x => x.Platform.ToLower() == platform.ToLower() && x.IsActive && !x.IsDeleted)
                    .OrderByDescending(x => x.VersionCode)
                    .FirstOrDefaultAsync(cancellationToken);

                return activeRelease != null ? MapToAdminResponse(activeRelease) : null;
            }

            return await _cache.GetOrCreateAsync("ActiveAndroidAppReleaseThresholds", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);

                var activeRelease = await _context.AppReleases
                    .AsNoTracking()
                    .Where(x => x.Platform.ToLower() == platform.ToLower() && x.IsActive && !x.IsDeleted)
                    .OrderByDescending(x => x.VersionCode)
                    .FirstOrDefaultAsync(cancellationToken);

                return activeRelease != null ? MapToAdminResponse(activeRelease) : null;
            });
        }

        public async Task<List<AppReleaseAdminResponse>> GetAllReleasesAsync(CancellationToken cancellationToken = default)
        {
            var releases = await _context.AppReleases
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(cancellationToken);

            return releases.Select(MapToAdminResponse).ToList();
        }

        private AppReleaseAdminResponse MapToAdminResponse(AppRelease release)
        {
            return new AppReleaseAdminResponse
            {
                PublicId = release.PublicId.ToString(),
                Platform = release.Platform,
                VersionName = release.VersionName,
                VersionCode = release.VersionCode,
                MinimumRecommendedVersionCode = release.MinimumRecommendedVersionCode,
                MinimumRequiredVersionCode = release.MinimumRequiredVersionCode,
                MinimumMandatoryVersionCode = release.MinimumMandatoryVersionCode,
                IsActive = release.IsActive,
                ApkFileName = release.ApkFileName,
                ApkDownloadUrl = release.ApkDownloadUrl,
                ApkSha256 = release.ApkSha256,
                FileSizeBytes = release.FileSizeBytes,
                ReleaseNotes = release.ReleaseNotes,
                PublishedAt = release.PublishedAt,
                CreatedAt = release.CreatedAt
            };
        }

        public async Task ReportAppStatusAsync(DeviceAppStatusRequest request, CancellationToken cancellationToken = default)
        {
            var deviceAppStatus = await _context.DeviceAppStatuses
                .FirstOrDefaultAsync(x => x.Platform.ToLower() == request.Platform.ToLower() && x.InstallationId == request.InstallationId, cancellationToken);

            int? deviceId = null;
            int? engineerId = null;

            if (request.DevicePublicId.HasValue)
            {
                var device = await _context.Devices
                    .FirstOrDefaultAsync(x => x.PublicId == request.DevicePublicId.Value && !x.IsDeleted, cancellationToken);
                
                if (device != null)
                {
                    deviceId = device.Id;
                    var activeAssignment = await _context.EngineerDevices
                        .FirstOrDefaultAsync(ed => ed.DeviceId == device.Id && ed.IsActive && !ed.IsDeleted, cancellationToken);
                    if (activeAssignment != null)
                    {
                        engineerId = activeAssignment.EngineerId;
                    }
                }
            }

            var activeRelease = await _context.AppReleases
                .AsNoTracking()
                .Where(x => x.Platform.ToLower() == request.Platform.ToLower() && x.IsActive && !x.IsDeleted)
                .OrderByDescending(x => x.VersionCode)
                .FirstOrDefaultAsync(cancellationToken);

            var updateLevel = AppUpdateLevel.None;
            var computedStatus = AppUpdateStatus.UpToDate;

            if (activeRelease != null)
            {
                var checkResponse = await CheckUpdateAsync(request.Platform, request.AppVersionCode, string.Empty, string.Empty, cancellationToken);
                updateLevel = checkResponse.UpdateLevel;

                switch (updateLevel)
                {
                    case AppUpdateLevel.None:
                        computedStatus = AppUpdateStatus.UpToDate;
                        break;
                    case AppUpdateLevel.Optional:
                        computedStatus = AppUpdateStatus.UpdateAvailable;
                        break;
                    case AppUpdateLevel.Required:
                        computedStatus = AppUpdateStatus.UpdateRequired;
                        break;
                    case AppUpdateLevel.Mandatory:
                        computedStatus = AppUpdateStatus.MandatoryUpdateRequired;
                        break;
                }
            }

            if (deviceAppStatus == null)
            {
                deviceAppStatus = new DeviceAppStatus
                {
                    InstallationId = request.InstallationId,
                    Platform = request.Platform,
                    CreatedAt = DateTime.UtcNow
                };
                _context.DeviceAppStatuses.Add(deviceAppStatus);
            }

            deviceAppStatus.DeviceId = deviceId;
            deviceAppStatus.EngineerId = engineerId;
            deviceAppStatus.AppVersionName = request.AppVersionName;
            deviceAppStatus.AppVersionCode = request.AppVersionCode;

            if (activeRelease != null)
            {
                deviceAppStatus.LatestVersionCode = activeRelease.VersionCode;
                deviceAppStatus.MinimumRecommendedVersionCode = activeRelease.MinimumRecommendedVersionCode;
                deviceAppStatus.MinimumRequiredVersionCode = activeRelease.MinimumRequiredVersionCode;
                deviceAppStatus.MinimumMandatoryVersionCode = activeRelease.MinimumMandatoryVersionCode;
                deviceAppStatus.RequiredReleasePublicId = activeRelease.PublicId;
            }

            deviceAppStatus.UpdateLevel = updateLevel;
            deviceAppStatus.Status = computedStatus;

            if (request.ClientStatus == AppUpdateStatus.UpdateStarted)
            {
                deviceAppStatus.LastUpdateStartedAt = DateTime.UtcNow;
            }
            else if (request.ClientStatus == AppUpdateStatus.UpdateFailed)
            {
                deviceAppStatus.LastUpdateFailedAt = DateTime.UtcNow;
                deviceAppStatus.LastError = request.LastError;
            }

            deviceAppStatus.LastReportedAt = DateTime.UtcNow;
            deviceAppStatus.LastCheckedAt = DateTime.UtcNow;
            deviceAppStatus.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<List<DeviceAppStatusAdminResponse>> GetAllDeviceStatusesAsync(CancellationToken cancellationToken = default)
        {
            var statuses = await _context.DeviceAppStatuses
                .Include(x => x.Device)
                .Where(x => x.Device != null && !x.Device.IsDeleted)
                .AsNoTracking()
                .OrderByDescending(x => x.LastReportedAt)
                .ToListAsync(cancellationToken);

            var deviceIds = statuses.Where(s => s.DeviceId.HasValue).Select(s => s.DeviceId!.Value).Distinct().ToList();

            var activeAssignments = await _context.EngineerDevices
                .Include(x => x.Engineer)
                .Where(x => deviceIds.Contains(x.DeviceId) && x.IsActive && !x.IsDeleted && x.Engineer != null && !x.Engineer.IsDeleted)
                .ToDictionaryAsync(x => x.DeviceId, x => x.Engineer!, cancellationToken);

            var latestLocations = await _context.DeviceLatestLocations
                .Where(x => deviceIds.Contains(x.DeviceId) && !x.IsDeleted)
                .ToDictionaryAsync(x => x.DeviceId, x => x.ReceivedAt, cancellationToken);

            return statuses.Select(s =>
            {
                Engineer? activeEngineer = null;
                if (s.DeviceId.HasValue)
                {
                    activeAssignments.TryGetValue(s.DeviceId.Value, out activeEngineer);
                }

                return new DeviceAppStatusAdminResponse
                {
                    InstallationId = s.InstallationId,
                    Platform = s.Platform,
                    EngineerPublicId = activeEngineer?.PublicId,
                    EngineerName = activeEngineer?.FullName,
                    DevicePublicId = s.Device?.PublicId,
                    DeviceName = s.Device?.DeviceName,
                    AppVersionName = s.AppVersionName,
                    AppVersionCode = s.AppVersionCode,
                    LatestVersionCode = s.LatestVersionCode,
                    MinimumRecommendedVersionCode = s.MinimumRecommendedVersionCode,
                    MinimumRequiredVersionCode = s.MinimumRequiredVersionCode,
                    MinimumMandatoryVersionCode = s.MinimumMandatoryVersionCode,
                    UpdateLevel = s.UpdateLevel,
                    Status = s.Status,
                    LastCheckedAt = s.LastCheckedAt,
                    LastReportedAt = s.LastReportedAt,
                    LastUpdateStartedAt = s.LastUpdateStartedAt,
                    LastUpdateFailedAt = s.LastUpdateFailedAt,
                    LastError = s.LastError,
                    LastLocationReceivedAt = s.DeviceId.HasValue && latestLocations.TryGetValue(s.DeviceId.Value, out var ts) ? ts : null
                };
            }).ToList();
        }
    }
}
