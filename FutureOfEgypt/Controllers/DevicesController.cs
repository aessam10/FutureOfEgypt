using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Devices;
using FutureOfEgypt.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [Authorize(Roles = AppRoles.ADMIN)]
    [ApiController]
    [Route("api/[controller]")]
    public sealed class DevicesController : ControllerBase
    {
        private readonly IDeviceService _deviceService;

        public DevicesController(IDeviceService deviceService)
        {
            _deviceService = deviceService;
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
        public async Task<IActionResult> GetDevices(CancellationToken cancellationToken)
        {
            return Ok(await _deviceService.GetDevicesAsync(cancellationToken));
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
    }
}