using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Tracking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
                Message = "Location update received successfully."
            });
        }

        [Authorize(Roles = AppRoles.ADMIN)]
        [HttpGet("latest")]
        public async Task<IActionResult> GetLatestLocations(CancellationToken cancellationToken)
        {
            var locations = await _trackingService.GetLatestLocationsAsync(cancellationToken);

            return Ok(locations);
        }

        [Authorize(Roles = AppRoles.ADMIN)]
        [HttpGet("history/{devicePublicId:guid}")]
        public async Task<IActionResult> GetDeviceLocationHistory(Guid devicePublicId, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken cancellationToken)
        {
            return Ok(await _trackingService.GetDeviceLocationHistoryAsync(devicePublicId, from, to, cancellationToken));
        }
    }
}