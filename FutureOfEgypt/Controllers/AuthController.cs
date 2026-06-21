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

            var adminRoleExists = await _roleManager.RoleExistsAsync(AppRoles.ADMIN);

            if (!adminRoleExists)
            {
                var roleResult = await _roleManager.CreateAsync(
                    new ApplicationRole
                    {
                        Name = AppRoles.ADMIN
                    });

                if (!roleResult.Succeeded)
                {
                    return BadRequest(new
                    {
                        message = "Failed to create Admin role.",
                        errors = roleResult.Errors.Select(x => x.Description)
                    });
                }
            }

            var admins = await _userManager.GetUsersInRoleAsync(AppRoles.ADMIN);

            if (admins.Any())
            {
                return BadRequest(new
                {
                    message = "First admin already exists. Use an existing admin account to create more admins."
                });
            }

            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(new { message = "Email is required." });

            if (string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Password is required." });

            var normalizedEmail = request.Email.Trim();

            var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);

            if (existingUser is not null)
                return BadRequest(new { message = "A user with this email already exists." });

            var displayName = string.IsNullOrWhiteSpace(request.UserName)
                ? normalizedEmail
                : request.UserName.Trim();

            var user = new ApplicationUser
            {
                UserName = string.IsNullOrWhiteSpace(request.UserName)
                    ? normalizedEmail
                    : request.UserName.Trim(),

                Email = normalizedEmail,
                FullName = displayName,
                EmailConfirmed = true
            };

            var createUserResult = await _userManager.CreateAsync(
                user,
                request.Password);

            if (!createUserResult.Succeeded)
            {
                return BadRequest(new
                {
                    message = "Failed to create first admin.",
                    errors = createUserResult.Errors.Select(x => x.Description)
                });
            }

            var addRoleResult = await _userManager.AddToRoleAsync(
                user,
                AppRoles.ADMIN);
            
            if (!addRoleResult.Succeeded)
            {
                return BadRequest(new
                {
                    message = "Failed to assign Admin role.",
                    errors = addRoleResult.Errors.Select(x => x.Description)
                });
            }

            return Ok(new
            {
                message = "First admin created successfully.",
                id = user.Id,
                email = user.Email,
                fullName = user.FullName,
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
        [AllowAnonymous]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout(
            [FromBody] LogoutRequest request,
            CancellationToken cancellationToken)
        {
            await _authService.LogoutAsync(
                request,
                cancellationToken);

            return Ok(new
            {
                message = "Logged out successfully."
            });
        }
    }
}