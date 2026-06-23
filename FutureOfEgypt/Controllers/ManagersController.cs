using FutureOfEgypt.Application.Features.Managers;
using FutureOfEgypt.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "AdminOnly")]
    public class ManagersController : ControllerBase
    {
        private readonly IManagersService _managersService;

        public ManagersController(IManagersService managersService)
        {
            _managersService = managersService;
        }

        [HttpGet]
        public async Task<IActionResult> GetManagers([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null)
        {
            var result = await _managersService.GetManagersAsync(pageNumber, pageSize, search);
            return Ok(result);
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateManager(Guid id, [FromBody] UpdateManagerRequest request)
        {
            var adminId = User.GetUserId();
            var adminEmail = User.GetUserEmail();
            var result = await _managersService.UpdateManagerAsync(adminId, adminEmail, id, request);
            return Ok(result);
        }

        [HttpPost("{id}/suspend")]
        public async Task<IActionResult> SuspendManager(Guid id)
        {
            var adminId = User.GetUserId();
            var adminEmail = User.GetUserEmail();
            var result = await _managersService.SuspendManagerAsync(adminId, adminEmail, id);
            return Ok(result);
        }

        [HttpPost("{id}/activate")]
        public async Task<IActionResult> ActivateManager(Guid id)
        {
            var adminId = User.GetUserId();
            var adminEmail = User.GetUserEmail();
            var result = await _managersService.ActivateManagerAsync(adminId, adminEmail, id);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteManager(Guid id)
        {
            var adminId = User.GetUserId();
            var adminEmail = User.GetUserEmail();
            await _managersService.DeleteManagerAsync(adminId, adminEmail, id);
            return NoContent();
        }
    }
}
