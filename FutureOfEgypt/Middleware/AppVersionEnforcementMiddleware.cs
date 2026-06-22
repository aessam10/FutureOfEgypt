using System.Text.Json;
using FutureOfEgypt.Application.Features.AppUpdates;

namespace FutureOfEgypt.Middleware
{
    public class AppVersionEnforcementMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AppVersionEnforcementMiddleware> _logger;

        public AppVersionEnforcementMiddleware(RequestDelegate next, ILogger<AppVersionEnforcementMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IAppUpdateService appUpdateService, FutureOfEgypt.Application.Features.AppUpdates.IAppReleaseFileService fileService)
        {
            var path = context.Request.Path.Value ?? string.Empty;

            // Excluded paths
            if (path.StartsWith("/api/app-updates", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api/devices/app-status", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/api/health", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/hubs", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            var platformHeader = context.Request.Headers["X-App-Platform"].FirstOrDefault();
            var versionCodeHeader = context.Request.Headers["X-App-Version-Code"].FirstOrDefault();

            bool isMissingHeaders = string.IsNullOrWhiteSpace(platformHeader) || string.IsNullOrWhiteSpace(versionCodeHeader);

            if (isMissingHeaders)
            {
                // Dashboard/browser requests without mobile headers can continue normally.
                // Mobile-sensitive endpoints via Engineer role must require version headers.
                bool isEngineer = context.User.Identity?.IsAuthenticated == true && context.User.IsInRole("Engineer");
                if (!isEngineer)
                {
                    await _next(context);
                    return;
                }
            }

            if (!isMissingHeaders && !string.Equals(platformHeader, "Android", StringComparison.OrdinalIgnoreCase))
            {
                // Only enforcing Android right now
                await _next(context);
                return;
            }

            int versionCode = 0;
            if (!isMissingHeaders && !int.TryParse(versionCodeHeader, out versionCode))
            {
                // Invalid version code header format
                await _next(context);
                return;
            }

            try
            {
                var requestScheme = context.Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? context.Request.Scheme;
                var requestHost = context.Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? context.Request.Host.Value;
                var activeRelease = await appUpdateService.GetActiveReleaseCachedAsync("Android", requestScheme, requestHost, context.RequestAborted);

                if (activeRelease != null && activeRelease.MinimumMandatoryVersionCode.HasValue)
                {
                    if (isMissingHeaders || versionCode < activeRelease.MinimumMandatoryVersionCode.Value)
                    {
                        context.Response.StatusCode = StatusCodes.Status426UpgradeRequired;
                        context.Response.ContentType = "application/json";

                        var generatedDownloadUrl = fileService.GetDownloadUrl(Guid.Parse(activeRelease.PublicId), requestScheme, requestHost);

                        var responsePayload = new
                        {
                            isUpdateRequired = true,
                            updateLevel = "Mandatory",
                            isBlocking = true,
                            message = isMissingHeaders ? "App update required. Version headers missing." : "App update required.",
                            latestVersionName = activeRelease.VersionName,
                            latestVersionCode = activeRelease.VersionCode,
                            minimumMandatoryVersionCode = activeRelease.MinimumMandatoryVersionCode.Value,
                            downloadUrl = generatedDownloadUrl,
                            apkSha256 = activeRelease.ApkSha256,
                            fileSizeBytes = activeRelease.FileSizeBytes,
                            releaseNotes = activeRelease.ReleaseNotes
                        };

                        await context.Response.WriteAsync(JsonSerializer.Serialize(responsePayload, new JsonSerializerOptions
                        {
                            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                        }));
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check active release threshold in enforcement middleware.");
                // Do not crash the API, bypass enforcement
            }

            await _next(context);
        }
    }
}
