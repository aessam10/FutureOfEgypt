using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Devices;
using FutureOfEgypt.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [Authorize(Policy = "AdminOrManager")]
    [ApiController]
    [Route("api/[controller]")]
    public sealed class DevicesController : ControllerBase
    {
        private readonly IDeviceService _deviceService;
        private readonly FutureOfEgypt.Application.Features.AppUpdates.IAppUpdateService _appUpdateService;

        public DevicesController(
            IDeviceService deviceService,
            FutureOfEgypt.Application.Features.AppUpdates.IAppUpdateService appUpdateService)
        {
            _deviceService = deviceService;
            _appUpdateService = appUpdateService;
        }
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateDeviceRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _deviceService.CreateDeviceAsync(
                adminUserId,
                adminEmail,
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetDevices(
            [FromQuery] DevicesQueryRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _deviceService.GetDevicesAsync(
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpPatch("{devicePublicId:guid}/status")]
        public async Task<IActionResult> UpdateStatus(
            Guid devicePublicId,
            [FromBody] UpdateDeviceStatusRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _deviceService.UpdateDeviceStatusAsync(
                adminUserId,
                adminEmail,
                devicePublicId,
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpDelete("{devicePublicId:guid}")]
        public async Task<IActionResult> Delete(
            Guid devicePublicId,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            await _deviceService.DeleteDeviceAsync(
                adminUserId,
                adminEmail,
                devicePublicId,
                cancellationToken);

            return NoContent();
        }

        [HttpPost("app-status")]
        [AllowAnonymous]
        public async Task<IActionResult> ReportAppStatus(
            [FromBody] FutureOfEgypt.Application.Features.AppUpdates.DeviceAppStatusRequest request,
            CancellationToken cancellationToken)
        {
            await _appUpdateService.ReportAppStatusAsync(request, cancellationToken);
            return Ok();
        }
    }
}