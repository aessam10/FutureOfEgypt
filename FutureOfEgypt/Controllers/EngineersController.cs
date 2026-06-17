using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Engineers;
using FutureOfEgypt.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [Authorize(Roles = AppRoles.ADMIN)]
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
        public async Task<IActionResult> GetEngineers(CancellationToken cancellationToken)
        {
            return Ok(await _engineerService.GetEngineersAsync(cancellationToken));
        }

        [HttpPatch("{engineerPublicId:guid}/status")]
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
    }
}