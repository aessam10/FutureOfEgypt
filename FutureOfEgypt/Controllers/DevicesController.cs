using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Devices;
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
        public async Task<IActionResult> CreateDevice(
            [FromBody] CreateDeviceRequest request,
            CancellationToken cancellationToken)
        {
            return Ok(await _deviceService.CreateDeviceAsync(request, cancellationToken));
        }

        [HttpGet]
        public async Task<IActionResult> GetDevices(CancellationToken cancellationToken)
        {
            return Ok(await _deviceService.GetDevicesAsync(cancellationToken));
        }
    }
}