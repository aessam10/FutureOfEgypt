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

            await _trackingService.ReceiveLocationUpdateAsync(
                engineerPublicId,
                request,
                cancellationToken);

            return Ok(new
            {
                message = "Location update received successfully."
            });
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
    }
}