using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [Authorize(Policy = "AdminOrManager")]
    [ApiController]
    [Route("api/[controller]")]
    public sealed class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
        {
            var summary = await _dashboardService.GetSummaryAsync(cancellationToken);

            return Ok(summary);
        }

        [HttpGet("engineers-status")]
        public async Task<IActionResult> GetEngineersStatus(CancellationToken cancellationToken)
        {
            var engineersStatus = await _dashboardService.GetEngineersStatusAsync(cancellationToken);

            return Ok(engineersStatus);
        }
    }
}