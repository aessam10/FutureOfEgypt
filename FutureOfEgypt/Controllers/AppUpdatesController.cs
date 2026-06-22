using FutureOfEgypt.Application.Features.AppUpdates;
using FutureOfEgypt.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/app-updates")]
    public class AppUpdatesController : ControllerBase
    {
        private readonly IAppUpdateService _appUpdateService;
        private readonly IAppReleaseFileService _fileService;
        private readonly ILogger<AppUpdatesController> _logger;

        public AppUpdatesController(
            IAppUpdateService appUpdateService,
            IAppReleaseFileService fileService,
            ILogger<AppUpdatesController> logger)
        {
            _appUpdateService = appUpdateService;
            _fileService = fileService;
            _logger = logger;
        }

        [HttpGet("{platform}/check")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckUpdate(string platform, [FromQuery] int versionCode, CancellationToken cancellationToken)
        {
            var requestScheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
            var requestHost = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
            var response = await _appUpdateService.CheckUpdateAsync(platform, versionCode, requestScheme, requestHost, cancellationToken);
            return Ok(response);
        }

        [HttpGet("{platform}/download/{releasePublicId}")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadApk(string platform, Guid releasePublicId, CancellationToken cancellationToken)
        {
            var releases = await _appUpdateService.GetAllReleasesAsync(cancellationToken);
            var release = releases.FirstOrDefault(x => x.PublicId == releasePublicId.ToString() && string.Equals(x.Platform, platform, StringComparison.OrdinalIgnoreCase));

            if (release == null)
            {
                return NotFound(new { message = "Release not found." });
            }

            if (!_fileService.FileExists(release.ApkFileName))
            {
                _logger.LogError("APK file missing for release {ReleasePublicId}: {FileName}", releasePublicId, release.ApkFileName);
                return NotFound(new { message = "APK file not found on server." });
            }

            var filePath = _fileService.GetApkPath(release.ApkFileName);
            var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

            return File(stream, "application/vnd.android.package-archive", release.ApkFileName);
        }

        [HttpPost("admin/releases")]
        [Authorize(Policy = "AdminOrManager")]
        public async Task<IActionResult> CreateRelease([FromBody] CreateAppReleaseRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var requestScheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
                var requestHost = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
                var response = await _appUpdateService.CreateReleaseAsync(request, requestScheme, requestHost, cancellationToken);
                return Ok(response);
            }
            catch (FileNotFoundException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("admin/releases/{publicId}/activate")]
        [Authorize(Policy = "AdminOrManager")]
        public async Task<IActionResult> ActivateRelease(Guid publicId, CancellationToken cancellationToken)
        {
            try
            {
                var response = await _appUpdateService.ActivateReleaseAsync(publicId, cancellationToken);
                return Ok(response);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("admin/releases/{publicId}/apk")]
        [Authorize(Policy = "AdminOrManager")]
        [RequestSizeLimit(314572800)] // 300 MB limit
        [RequestFormLimits(MultipartBodyLengthLimit = 314572800)]
        public async Task<IActionResult> UploadReleaseApk(Guid publicId, IFormFile file, CancellationToken cancellationToken)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded." });
            }

            if (!Path.GetExtension(file.FileName).Equals(".apk", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Only .apk files are allowed." });
            }

            try
            {
                using var stream = file.OpenReadStream();
                var requestScheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
                var requestHost = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
                
                // Construct a safe unique filename to avoid overwrites
                var safeFileName = $"{publicId}_{Path.GetFileName(file.FileName)}";

                var response = await _appUpdateService.UploadReleaseApkAsync(publicId, stream, safeFileName, requestScheme, requestHost, cancellationToken);
                return Ok(response);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading APK for release {PublicId}", publicId);
                return StatusCode(500, new { message = "An error occurred while uploading the APK." });
            }
        }

        [HttpGet("admin/releases")]
        [Authorize(Policy = "AdminOrManager")]
        public async Task<IActionResult> GetAllReleases(CancellationToken cancellationToken)
        {
            var releases = await _appUpdateService.GetAllReleasesAsync(cancellationToken);
            return Ok(releases);
        }

        [HttpGet("admin/device-statuses")]
        [Authorize(Policy = "AdminOrManager")]
        public async Task<IActionResult> GetDeviceStatuses(CancellationToken cancellationToken)
        {
            var statuses = await _appUpdateService.GetAllDeviceStatusesAsync(cancellationToken);
            return Ok(statuses);
        }
    }
}
