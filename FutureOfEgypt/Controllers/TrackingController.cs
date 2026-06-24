using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Tracking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class TrackingController : ControllerBase
    {
        private readonly ITrackingService _trackingService;

        public TrackingController(ITrackingService trackingService)
        {
            _trackingService = trackingService;
        }

        [EnableRateLimiting("TrackingPolicy")]
        [Authorize(Roles = AppRoles.ENGINEER)]
        [HttpPost("validate-device")]
        public async Task<IActionResult> ValidateDevice(
            [FromBody] DeviceValidationRequest request,
            CancellationToken cancellationToken)
        {
            var engineerPublicIdValue = User.FindFirstValue("engineerPublicId");

            if (string.IsNullOrWhiteSpace(engineerPublicIdValue))
                return Unauthorized(new { message = "Engineer identity is missing from token." });

            if (!Guid.TryParse(engineerPublicIdValue, out var engineerPublicId))
                return Unauthorized(new { message = "Invalid engineer identity in token." });

            var result = await _trackingService.ValidateDeviceAsync(
                engineerPublicId,
                request,
                cancellationToken);

            return Ok(result);
        }

        [EnableRateLimiting("TrackingPolicy")]
        [Authorize(Roles = AppRoles.ENGINEER)]
        [HttpPost("location")]
        public async Task<IActionResult> ReceiveLocationUpdate(
            [FromBody] ReceiveLocationUpdateRequest request,
            CancellationToken cancellationToken)
        {
            var engineerPublicIdValue = User.FindFirstValue("engineerPublicId");

            if (string.IsNullOrWhiteSpace(engineerPublicIdValue))
                return Unauthorized(new { message = "Engineer identity is missing from token." });

            if (!Guid.TryParse(engineerPublicIdValue, out var engineerPublicId))
                return Unauthorized(new { message = "Invalid engineer identity in token." });

            var response = await _trackingService.ReceiveLocationUpdateAsync(
                engineerPublicId,
                request,
                cancellationToken);

            return Ok(response);
        }

        [EnableRateLimiting("TrackingPolicy")]
        [Authorize(Roles = AppRoles.ENGINEER)]
        [HttpPost("device-health")]
        public async Task<IActionResult> ReceiveDeviceHealth(
            [FromBody] DeviceHealthRequest request,
            CancellationToken cancellationToken)
        {
            var engineerPublicIdValue = User.FindFirstValue("engineerPublicId");

            if (string.IsNullOrWhiteSpace(engineerPublicIdValue))
                return Unauthorized(new { message = "Engineer identity is missing from token." });

            if (!Guid.TryParse(engineerPublicIdValue, out var engineerPublicId))
                return Unauthorized(new { message = "Invalid engineer identity in token." });

            await _trackingService.ReceiveDeviceHealthAsync(
                engineerPublicId,
                request,
                cancellationToken);

            return Ok(new { message = "Health report received." });
        }

        [Authorize(Policy = "AdminOrManager")]
        [HttpGet("latest")]
        public async Task<IActionResult> GetLatestLocations(CancellationToken cancellationToken)
        {
            var locations = await _trackingService.GetLatestLocationsAsync(cancellationToken);

            return Ok(locations);
        }

        [Authorize(Policy = "AdminOrManager")]
        [HttpGet("history/{devicePublicId:guid}")]
        public async Task<IActionResult> GetDeviceLocationHistory(
            Guid devicePublicId,
            [FromQuery] LocationHistoryQueryRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _trackingService.GetDeviceLocationHistoryAsync(
                devicePublicId,
                request,
                cancellationToken);

            return Ok(result);
        }

        [Authorize(Policy = "AdminOrManager")]
        [HttpGet("history/engineer/{engineerPublicId:guid}")]
        public async Task<IActionResult> GetEngineerLocationHistoryByDate(
            Guid engineerPublicId,
            [FromQuery] string date,
            [FromQuery] int maxPoints = 150,
            CancellationToken cancellationToken = default)
        {
            var result = await _trackingService.GetEngineerLocationHistoryByDateAsync(
                engineerPublicId,
                date,
                maxPoints,
                cancellationToken);

            return Ok(result);
        }

        [Authorize(Policy = "AdminOrManager")]
        [HttpGet("latest/hidden")]
        public async Task<IActionResult> GetHiddenLatestLocations(CancellationToken cancellationToken)
        {
            var locations = await _trackingService.GetHiddenLatestLocationsAsync(cancellationToken);
            return Ok(locations);
        }

        [Authorize(Policy = "AdminOrManager")]
        [HttpPatch("latest/{devicePublicId:guid}/hide")]
        public async Task<IActionResult> HideLatestLocation(
            Guid devicePublicId,
            CancellationToken cancellationToken)
        {
            var adminIdValue = User.FindFirstValue("adminId") ?? User.FindFirstValue("managerId");
            
            if (string.IsNullOrWhiteSpace(adminIdValue))
            {
                var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!string.IsNullOrWhiteSpace(idClaim))
                {
                    adminIdValue = idClaim;
                }
                else
                {
                    return Unauthorized(new { message = "User identity is missing from token." });
                }
            }

            if (!Guid.TryParse(adminIdValue, out var adminId))
                return Unauthorized(new { message = "Invalid user identity in token." });

            await _trackingService.HideLatestLocationAsync(devicePublicId, adminId, cancellationToken);

            return Ok(new
            {
                message = "Latest location hidden successfully."
            });
        }

        [Authorize(Policy = "AdminOrManager")]
        [HttpPatch("latest/{devicePublicId:guid}/unhide")]
        public async Task<IActionResult> UnhideLatestLocation(
            Guid devicePublicId,
            CancellationToken cancellationToken)
        {
            var adminIdValue = User.FindFirstValue("adminId") ?? User.FindFirstValue("managerId");
            
            if (string.IsNullOrWhiteSpace(adminIdValue))
            {
                var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!string.IsNullOrWhiteSpace(idClaim))
                {
                    adminIdValue = idClaim;
                }
                else
                {
                    return Unauthorized(new { message = "User identity is missing from token." });
                }
            }

            if (!Guid.TryParse(adminIdValue, out var adminId))
                return Unauthorized(new { message = "Invalid user identity in token." });

            await _trackingService.UnhideLatestLocationAsync(devicePublicId, adminId, cancellationToken);

            return Ok(new
            {
                message = "Latest location unhidden successfully."
            });
        }

        [Authorize(Policy = "AdminOrManager")]
        [HttpGet("analysis/engineer/{engineerPublicId:guid}")]
        public async Task<IActionResult> GetDailyAnalysis(
            Guid engineerPublicId,
            [FromQuery] string date,
            CancellationToken cancellationToken)
        {
            var result = await _trackingService.GetDailyAnalysisAsync(
                engineerPublicId,
                date,
                cancellationToken);

            return Ok(result);
        }
    }
}