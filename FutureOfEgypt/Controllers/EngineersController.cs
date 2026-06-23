using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Engineers;
using FutureOfEgypt.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [Authorize(Policy = "AdminOrManager")]
    [ApiController]
    [Route("api/[controller]")]
    public sealed class EngineersController : ControllerBase
    {
        private readonly IEngineerService _engineerService;

        public EngineersController(IEngineerService engineerService)
        {
            _engineerService = engineerService;
        }

        [HttpPost]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Create(
            [FromBody] CreateEngineerRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _engineerService.CreateEngineerAsync(
                adminUserId,
                adminEmail,
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetEngineers(
            [FromQuery] EngineersQueryRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _engineerService.GetEngineersAsync(
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpPatch("{engineerPublicId:guid}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> UpdateEngineer(
            Guid engineerPublicId,
            [FromBody] UpdateEngineerRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _engineerService.UpdateEngineerAsync(
                adminUserId, adminEmail, engineerPublicId, request, cancellationToken);

            return Ok(result);
        }

        [HttpPatch("{engineerPublicId:guid}/status")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> UpdateStatus(
            Guid engineerPublicId,
            [FromBody] UpdateEngineerStatusRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _engineerService.UpdateEngineerStatusAsync(
                adminUserId,
                adminEmail,
                engineerPublicId,
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpDelete("{engineerPublicId:guid}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeleteEngineer(
            Guid engineerPublicId,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            await _engineerService.DeleteEngineerAsync(adminUserId, adminEmail, engineerPublicId, cancellationToken);
            return NoContent();
        }
    }
}