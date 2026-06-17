using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.EngineerDevices;
using FutureOfEgypt.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [Authorize(Roles = AppRoles.ADMIN)]
    [ApiController]
    [Route("api/[controller]")]
    public sealed class EngineerDevicesController : ControllerBase
    {
        private readonly IEngineerDeviceService _engineerDeviceService;

        public EngineerDevicesController(IEngineerDeviceService engineerDeviceService)
        {
            _engineerDeviceService = engineerDeviceService;
        }

        [HttpPost("assign")]
        public async Task<IActionResult> Assign(
            [FromBody] AssignDeviceRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _engineerDeviceService.AssignDeviceAsync(
                adminUserId,
                adminEmail,
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAssignments(
            [FromQuery] EngineerDevicesQueryRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _engineerDeviceService.GetAssignmentsAsync(
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveAssignments(
            [FromQuery] EngineerDevicesQueryRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _engineerDeviceService.GetActiveAssignmentsAsync(
                request,
                cancellationToken);

            return Ok(result);
        }
    }
}