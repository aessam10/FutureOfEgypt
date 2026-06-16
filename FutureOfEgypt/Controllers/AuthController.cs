using FutureOfEgypt.Application.Features.Auth;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register-admin")]
        public async Task<IActionResult> RegisterAdmin(
            [FromBody] RegisterAdminRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _authService.RegisterAdminAsync(
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpPost("register-engineer")]
        public async Task<IActionResult> RegisterEngineer(
            [FromBody] RegisterEngineerUserRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _authService.RegisterEngineerUserAsync(
                request,
                cancellationToken);

            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _authService.LoginAsync(
                request,
                cancellationToken);

            return Ok(result);
        }
    }
}