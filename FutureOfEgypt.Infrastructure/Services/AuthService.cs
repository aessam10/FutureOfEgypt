using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.Auth;
using FutureOfEgypt.Infrastructure.Identity;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            AppDbContext context,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResponse> RegisterAdminAsync(
            RegisterAdminRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new InvalidOperationException("Full name is required.");

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

            await EnsureRoleExistsAsync(AppRoles.ADMIN);

            var email = request.Email.Trim();

            var existingUser = await _userManager.FindByEmailAsync(email);

            if (existingUser is not null)
                throw new InvalidOperationException("Email is already registered.");

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = request.FullName.Trim(),
                EngineerId = null
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);

            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(x => x.Description));
                throw new InvalidOperationException(errors);
            }

            var roleResult = await _userManager.AddToRoleAsync(user, AppRoles.ADMIN);

            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(x => x.Description));
                throw new InvalidOperationException(errors);
            }

            var roles = await _userManager.GetRolesAsync(user);

            var jwt = GenerateJwtToken(user, engineerPublicId: null, roles);

            return new AuthResponse
            {
                UserId = user.Id,
                EngineerPublicId = null,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                Roles = roles.ToList(),
                Token = jwt.Token,
                ExpiresAtUtc = jwt.ExpiresAtUtc
            };
        }

        public async Task<AuthResponse> RegisterEngineerUserAsync(
            RegisterEngineerUserRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

            await EnsureRoleExistsAsync(AppRoles.ENGINEER);

            var engineer = await _context.Engineers
                .FirstOrDefaultAsync(
                    x => x.PublicId == request.EngineerPublicId && !x.IsDeleted,
                    cancellationToken);

            if (engineer is null)
                throw new InvalidOperationException("Engineer does not exist.");

            var email = request.Email.Trim();

            var existingUser = await _userManager.FindByEmailAsync(email);

            if (existingUser is not null)
                throw new InvalidOperationException("Email is already registered.");

            var engineerAlreadyHasUser = await _context.Users
                .AnyAsync(x => x.EngineerId == engineer.Id, cancellationToken);

            if (engineerAlreadyHasUser)
                throw new InvalidOperationException("This engineer already has a login account.");

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = engineer.FullName,
                EngineerId = engineer.Id
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);

            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(x => x.Description));
                throw new InvalidOperationException(errors);
            }

            var roleResult = await _userManager.AddToRoleAsync(user, AppRoles.ENGINEER);

            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(x => x.Description));
                throw new InvalidOperationException(errors);
            }

            var roles = await _userManager.GetRolesAsync(user);

            var jwt = GenerateJwtToken(user, engineer.PublicId, roles);

            return new AuthResponse
            {
                UserId = user.Id,
                EngineerPublicId = engineer.PublicId,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                Roles = roles.ToList(),
                Token = jwt.Token,
                ExpiresAtUtc = jwt.ExpiresAtUtc
            };
        }

        public async Task<AuthResponse> LoginAsync(
            LoginRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

            var email = request.Email.Trim();

            var user = await _userManager.FindByEmailAsync(email);

            if (user is null)
                throw new InvalidOperationException("Invalid email or password.");

            var passwordIsValid = await _userManager.CheckPasswordAsync(
                user,
                request.Password);

            if (!passwordIsValid)
                throw new InvalidOperationException("Invalid email or password.");

            Guid? engineerPublicId = null;

            if (user.EngineerId.HasValue)
            {
                engineerPublicId = await _context.Engineers
                    .Where(x => x.Id == user.EngineerId.Value && !x.IsDeleted)
                    .Select(x => (Guid?)x.PublicId)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            var roles = await _userManager.GetRolesAsync(user);

            var jwt = GenerateJwtToken(user, engineerPublicId, roles);

            return new AuthResponse
            {
                UserId = user.Id,
                EngineerPublicId = engineerPublicId,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                Roles = roles.ToList(),
                Token = jwt.Token,
                ExpiresAtUtc = jwt.ExpiresAtUtc
            };
        }

        private async Task EnsureRoleExistsAsync(string roleName)
        {
            var exists = await _roleManager.RoleExistsAsync(roleName);

            if (exists)
                return;

            var result = await _roleManager.CreateAsync(new ApplicationRole
            {
                Name = roleName
            });

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(x => x.Description));
                throw new InvalidOperationException(errors);
            }
        }

        private (string Token, DateTime ExpiresAtUtc) GenerateJwtToken(
            ApplicationUser user,
            Guid? engineerPublicId,
            IEnumerable<string> roles)
        {
            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];
            var key = _configuration["Jwt:Key"];
            var expiresInMinutes = int.Parse(_configuration["Jwt:ExpiresInMinutes"] ?? "120");

            if (string.IsNullOrWhiteSpace(key))
                throw new InvalidOperationException("JWT key is missing.");

            var expiresAtUtc = DateTime.UtcNow.AddMinutes(expiresInMinutes);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim("fullName", user.FullName)
            };

            if (engineerPublicId.HasValue)
            {
                claims.Add(new Claim("engineerPublicId", engineerPublicId.Value.ToString()));
            }

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
                claims.Add(new Claim("role", role));
            }

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expiresAtUtc,
                signingCredentials: credentials);

            return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
        }
    }
}