using Microsoft.AspNetCore.Authorization;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class HealthController : ControllerBase
    {
        [AllowAnonymous]
        [HttpGet]
        public IActionResult Basic()
        {
            return Ok(new
            {
                status = "Healthy",
                application = "FutureOfEgypt API",
                utcNow = DateTime.UtcNow
            });
        }
    }
}
