using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Auth;
using FutureOfEgypt.Extensions;
using FutureOfEgypt.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FutureOfEgypt.Controllers
{
    [EnableRateLimiting("AuthPolicy")]
    [ApiController]
    [Route("api/[controller]")]
    public sealed class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly IConfiguration _configuration;

        public AuthController(IAuthService authService,
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            IConfiguration configuration)
        {
            _authService = authService;
            _userManager = userManager;
            _roleManager = roleManager;
            _configuration = configuration;
        }
        [AllowAnonymous]
        [HttpPost("create-first-admin")]
        public async Task<IActionResult> CreateFirstAdmin(
            [FromBody] CreateFirstAdminRequest request,
            CancellationToken cancellationToken)
        {
            var configuredBootstrapPassword = _configuration["Bootstrap:FirstAdminPassword"];

            if (string.IsNullOrWhiteSpace(configuredBootstrapPassword))
                return BadRequest(new { message = "Bootstrap password is not configured." });

            if (request.BootstrapPassword != configuredBootstrapPassword)
                return Unauthorized(new { message = "Invalid bootstrap password." });

            var result = await _authService.CreateFirstAdminAsync(request, cancellationToken);

            return Ok(new
            {
                message = "First admin created successfully.",
                id = result.UserId,
                email = result.Email,
                fullName = result.FullName,
                role = AppRoles.ADMIN
            });
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost("register-admin")]
        public IActionResult RegisterAdmin()
        {
            return BadRequest(new
            {
                message = "Admin can only be created once using create-first-admin."
            });
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost("register-manager")]
        public async Task<IActionResult> RegisterManager(
            [FromBody] RegisterAdminRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _authService.RegisterManagerAsync(
                adminUserId,
                adminEmail,
                request,
                cancellationToken);

            return Ok(result);
        }

        [Authorize(Policy = "AdminOrManager")]
        [HttpPost("register-engineer")]
        public async Task<IActionResult> RegisterEngineer(
            [FromBody] RegisterEngineerUserRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _authService.RegisterEngineerUserAsync(
                adminUserId,
                adminEmail,
                request,
                cancellationToken);

            return Ok(result);
        }

        [Authorize(Policy = "AdminOrManager")]
        [HttpPost("register-engineer-complete")]
        public async Task<IActionResult> RegisterEngineerComplete(
            [FromBody] RegisterEngineerCompleteRequest request,
            CancellationToken cancellationToken)
        {
            var adminUserId = User.GetUserId();
            var adminEmail = User.GetUserEmail();

            var result = await _authService.RegisterEngineerCompleteAsync(
                adminUserId,
                adminEmail,
                request,
                cancellationToken);

            return Ok(result);
        }

        [AllowAnonymous]
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
        [AllowAnonymous]
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(
    [FromBody] RefreshTokenRequest request,
    CancellationToken cancellationToken)
        {
            var result = await _authService.RefreshAsync(
                request,
                cancellationToken);

            return Ok(result);
        }
        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken cancellationToken)
        {
            await _authService.LogoutAsync(request, cancellationToken);
            return Ok(new { message = "Logged out successfully" });
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(
            [FromBody] ForgotPasswordRequest request,
            CancellationToken cancellationToken)
        {
            await _authService.ForgotPasswordAsync(request, cancellationToken);
            // Always return this exact string to prevent email enumeration
            return Ok(new { message = "If this email exists, a password reset link has been sent." });
        }

        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(
            [FromBody] ResetPasswordRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                await _authService.ResetPasswordAsync(request, cancellationToken);
                return Ok(new { message = "Password has been reset successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}