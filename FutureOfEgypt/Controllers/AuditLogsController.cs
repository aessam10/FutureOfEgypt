using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.AuditLog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [Authorize(Policy = "AdminOrManager")]
    [ApiController]
    [Route("api/[controller]")]
    public sealed class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _auditLogService;

        public AuditLogsController(IAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] AuditLogsQueryRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _auditLogService.GetLogsAsync(
                request,
                cancellationToken);

            return Ok(result);
        }
    }
}
