using FutureOfEgypt.Application.Features.Auth;
using FutureOfEgypt.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace FutureOfEgypt.Controllers
{
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
        public async Task<IActionResult> CreateFirstAdmin(CreateFirstAdminRequest request)
        {
            var requiredBootstrapPassword =
                _configuration["Bootstrap:FirstAdminPassword"];

            if (string.IsNullOrWhiteSpace(requiredBootstrapPassword))
                return StatusCode(500, "Bootstrap password is not configured.");

            if (request.BootstrapPassword != requiredBootstrapPassword)
                return Unauthorized("Invalid bootstrap password.");

            var adminRoleExists = await _roleManager.RoleExistsAsync("Admin");

            if (!adminRoleExists)
            {
                var roleResult = await _roleManager.CreateAsync(
                    new ApplicationRole { Name = "Admin" });

                if (!roleResult.Succeeded)
                    return BadRequest(roleResult.Errors);
            }

            var adminUsers = await _userManager.GetUsersInRoleAsync("Admin");

            if (adminUsers.Any())
                return BadRequest("Admin already exists. First admin creation is disabled.");

            var user = new ApplicationUser
            {
                UserName = request.UserName,
                Email = request.Email,
                EmailConfirmed = true
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);

            if (!createResult.Succeeded)
                return BadRequest(createResult.Errors);

            var addRoleResult = await _userManager.AddToRoleAsync(user, "Admin");

            if (!addRoleResult.Succeeded)
                return BadRequest(addRoleResult.Errors);

            return Ok(new
            {
                message = "First admin created successfully.",
                user.Id,
                user.Email,
                role = "Admin"
            });
        }

        [Authorize(Roles = "Admin")]
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

        [Authorize(Roles = "Admin")]
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