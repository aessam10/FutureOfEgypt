using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Engineers;
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
        public async Task<IActionResult> CreateEngineer(
            [FromBody] CreateEngineerRequest request,
            CancellationToken cancellationToken)
        {
            return Ok(await _engineerService.CreateEngineerAsync(
                request,
                cancellationToken));
        }

        [HttpGet]
        public async Task<IActionResult> GetEngineers(CancellationToken cancellationToken)
        {
            return Ok(await _engineerService.GetEngineersAsync(cancellationToken));
        }
    }
}