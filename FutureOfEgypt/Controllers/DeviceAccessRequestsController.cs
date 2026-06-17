using System.Security.Claims;
using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.DeviceAccessRequests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FutureOfEgypt.Extensions;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class DeviceAccessRequestsController : ControllerBase
    {
        private readonly IDeviceAccessRequestService _deviceAccessRequestService;

        public DeviceAccessRequestsController(
            IDeviceAccessRequestService deviceAccessRequestService)
        {
            _deviceAccessRequestService = deviceAccessRequestService;
        }

        [Authorize(Roles = AppRoles.ENGINEER)]
        [HttpPost("request")]
        public async Task<IActionResult> CreateRequest(
            [FromBody] CreateDeviceAccessRequestRequest request,
            CancellationToken cancellationToken)
        {
            var engineerPublicIdValue = User.FindFirstValue("engineerPublicId");

            if (string.IsNullOrWhiteSpace(engineerPublicIdValue))
                return Unauthorized(new { message = "Engineer identity is missing from token." });

            if (!Guid.TryParse(engineerPublicIdValue, out var engineerPublicId))
                return Unauthorized(new { message = "Invalid engineer identity in token." });

            var result = await _deviceAccessRequestService.CreateRequestAsync(
                engineerPublicId,
                request,
                cancellationToken);

            return Ok(result);
        }

        [Authorize(Roles = AppRoles.ADMIN)]
        [HttpGet]
        public async Task<IActionResult> GetRequests(
            [FromQuery] DeviceAccessRequestsQueryRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _deviceAccessRequestService.GetRequestsAsync(
                request,
                cancellationToken);

            return Ok(result);
        }
        [Authorize(Roles = AppRoles.ADMIN)]
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingRequests(
            [FromQuery] DeviceAccessRequestsQueryRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _deviceAccessRequestService.GetPendingRequestsAsync(
                request,
                cancellationToken);

            return Ok(result);
        }

        [Authorize(Roles = AppRoles.ADMIN)]
        [HttpPost("{requestPublicId:guid}/approve")]
        public async Task<IActionResult> Approve(
            Guid requestPublicId,
            [FromBody] ReviewDeviceAccessRequestRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _deviceAccessRequestService.ApproveAsync(
                requestPublicId,
                adminUserId,
                adminEmail,
                request,
                cancellationToken);

            return Ok(result);
        }

        [Authorize(Roles = AppRoles.ADMIN)]
        [HttpPost("{requestPublicId:guid}/reject")]
        public async Task<IActionResult> Reject(
            Guid requestPublicId,
            [FromBody] ReviewDeviceAccessRequestRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _deviceAccessRequestService.RejectAsync(
                requestPublicId,
                adminUserId,
                adminEmail,
                request,
                cancellationToken);

            return Ok(result);
        }
    }
}