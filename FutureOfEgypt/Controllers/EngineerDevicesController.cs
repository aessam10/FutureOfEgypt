using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.EngineerDevices;
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
        public async Task<IActionResult> AssignDevice(
            [FromBody] AssignDeviceRequest request,
            CancellationToken cancellationToken)
        {
            return Ok(await _engineerDeviceService.AssignDeviceAsync(request, cancellationToken));
        }

        [HttpGet]
        public async Task<IActionResult> GetAssignments(CancellationToken cancellationToken)
        {
            return Ok(await _engineerDeviceService.GetAssignmentsAsync(cancellationToken));
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveAssignments(CancellationToken cancellationToken)
        {
            var assignments = await _engineerDeviceService.GetActiveAssignmentsAsync(cancellationToken);

            return Ok(assignments);
        }
    }
}