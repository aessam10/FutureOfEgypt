using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Application.Features.AuditLog;
using FutureOfEgypt.Application.Features.Auth;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Identity;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IAuditLogService _auditLogService;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            AppDbContext context,
            IConfiguration configuration,
            IAuditLogService auditLogService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _context = context;
            _configuration = configuration;
            _auditLogService = auditLogService;
        }

        public async Task<UserAccountResponse> RegisterAdminAsync(
            Guid performedByUserId,
            string performedByEmail,
            RegisterAdminRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new InvalidOperationException("Full name is required.");

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

            var email = request.Email.Trim();

            var existingUser = await _userManager.FindByEmailAsync(email);

            if (existingUser is not null)
                throw new InvalidOperationException("Email is already registered.");

            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = request.FullName.Trim(),
                    CompanyEmail = string.IsNullOrWhiteSpace(request.CompanyEmail)
                        ? null
                        : request.CompanyEmail.Trim().ToLowerInvariant(),
                    UserType = UserType.Admin,
                    EngineerId = null
                };

                var createResult = await _userManager.CreateAsync(user, request.Password);

                if (!createResult.Succeeded)
                {
                    var errors = string.Join(", ", createResult.Errors.Select(x => x.Description));
                    throw new InvalidOperationException(errors);
                }

                // Create Admin profile
                var adminProfile = new Admin
                {
                    UserId = user.Id,
                    FullName = user.FullName,
                    Email = user.Email
                };
                await _context.Admins.AddAsync(adminProfile, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                // Assign role
                await AssignSingleBusinessRoleAsync(user, AppRoles.ADMIN, cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                var response = await BuildUserAccountResponseAsync(user, cancellationToken);

                await _auditLogService.CreateAsync(
                    new CreateAuditLogRequest
                    {
                        ActionType = AuditActionType.AdminUserCreated,
                        PerformedByUserId = performedByUserId,
                        PerformedByEmail = performedByEmail,
                        EntityName = nameof(ApplicationUser),
                        EntityPublicId = user.Id,
                        Description = $"Admin created admin user '{user.Email}'.",
                        MetadataJson = JsonSerializer.Serialize(new
                        {
                            createdUserId = user.Id,
                            user.Email,
                            user.FullName,
                            roles = response.Roles
                        })
                    },
                    cancellationToken);

                return response;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        public async Task<UserAccountResponse> RegisterManagerAsync(
            Guid performedByUserId,
            string performedByEmail,
            RegisterAdminRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new InvalidOperationException("Full name is required.");

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

            var email = request.Email.Trim();

            var existingUser = await _userManager.FindByEmailAsync(email);

            if (existingUser is not null)
                throw new InvalidOperationException("Email is already registered.");

            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = request.FullName.Trim(),
                    UserType = UserType.Manager,
                    EngineerId = null
                };

                var createResult = await _userManager.CreateAsync(user, request.Password);

                if (!createResult.Succeeded)
                {
                    var errors = string.Join(", ", createResult.Errors.Select(x => x.Description));
                    throw new InvalidOperationException(errors);
                }

                // Create Manager profile
                var managerProfile = new Manager
                {
                    UserId = user.Id,
                    FullName = user.FullName,
                    Email = user.Email
                };
                await _context.Managers.AddAsync(managerProfile, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                // Assign role
                await AssignSingleBusinessRoleAsync(user, AppRoles.MANAGER, cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                var response = await BuildUserAccountResponseAsync(user, cancellationToken);

                await _auditLogService.CreateAsync(
                    new CreateAuditLogRequest
                    {
                        ActionType = AuditActionType.AdminUserCreated,
                        PerformedByUserId = performedByUserId,
                        PerformedByEmail = performedByEmail,
                        EntityName = nameof(ApplicationUser),
                        EntityPublicId = user.Id,
                        Description = $"Admin created manager user '{user.Email}'.",
                        MetadataJson = JsonSerializer.Serialize(new
                        {
                            createdUserId = user.Id,
                            user.Email,
                            user.FullName,
                            roles = response.Roles
                        })
                    },
                    cancellationToken);

                return response;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        public async Task<UserAccountResponse> RegisterEngineerUserAsync(
            Guid performedByUserId,
            string performedByEmail,
            RegisterEngineerUserRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

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

            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = engineer.FullName,
                    UserType = UserType.Engineer,
                    EngineerId = engineer.Id
                };

                var createResult = await _userManager.CreateAsync(user, request.Password);

                if (!createResult.Succeeded)
                {
                    var errors = string.Join(", ", createResult.Errors.Select(x => x.Description));
                    throw new InvalidOperationException(errors);
                }

                // Link Engineer profile to the user
                engineer.UserId = user.Id;
                _context.Engineers.Update(engineer);
                await _context.SaveChangesAsync(cancellationToken);

                // Assign role
                await AssignSingleBusinessRoleAsync(user, AppRoles.ENGINEER, cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                var response = await BuildUserAccountResponseAsync(user, cancellationToken);

                await _auditLogService.CreateAsync(
                    new CreateAuditLogRequest
                    {
                        ActionType = AuditActionType.EngineerUserCreated,
                        PerformedByUserId = performedByUserId,
                        PerformedByEmail = performedByEmail,
                        EntityName = nameof(ApplicationUser),
                        EntityPublicId = user.Id,
                        Description = $"Admin created engineer user '{user.Email}'.",
                        MetadataJson = JsonSerializer.Serialize(new
                        {
                            createdUserId = user.Id,
                            engineerPublicId = response.EngineerPublicId,
                            user.Email,
                            user.FullName,
                            roles = response.Roles
                        })
                    },
                    cancellationToken);

                return response;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        private async Task<(Guid? DevicePublicId, string? DeviceName)> GetActiveDeviceForUserAsync(
    ApplicationUser user,
    CancellationToken cancellationToken = default)
        {
            if (!user.EngineerId.HasValue)
                return (null, null);

            var activeDevice = await _context.EngineerDevices
                .AsNoTracking()
                .Include(x => x.Device)
                .Where(x => x.EngineerId == user.EngineerId.Value
                            && x.IsActive
                            && !x.IsDeleted
                            && x.Device != null
                            && !x.Device.IsDeleted
                            && x.Device.Status == DeviceStatus.Active)
                .OrderByDescending(x => x.AssignedAtUtc)
                .Select(x => new
                {
                    x.Device!.PublicId,
                    x.Device.DeviceName
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (activeDevice is null)
                return (null, null);

            return (activeDevice.PublicId, activeDevice.DeviceName);
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

            if (user.IsDeleted)
                throw new InvalidOperationException("Account is deleted.");

            if (user.IsSuspended)
                throw new InvalidOperationException("Account is suspended.");

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

            return await BuildAuthResponseAsync(user, cancellationToken);
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
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim("fullName", user.FullName),
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

        public async Task<AuthResponse> RefreshAsync(
    RefreshTokenRequest request,
    CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken))
                throw new InvalidOperationException("Refresh token is required.");

            var refreshTokenHash = HashRefreshToken(request.RefreshToken);

            var storedRefreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(
                    x => x.TokenHash == refreshTokenHash,
                    cancellationToken);

            if (storedRefreshToken is null)
                throw new InvalidOperationException("Invalid refresh token.");

            if (!storedRefreshToken.IsActive)
                throw new InvalidOperationException("Refresh token is expired or revoked.");

            var user = await _userManager.FindByIdAsync(
                storedRefreshToken.UserId.ToString());

            if (user is null)
                throw new InvalidOperationException("User does not exist.");

            if (user.IsDeleted)
                throw new InvalidOperationException("Account is deleted.");

            if (user.IsSuspended)
                throw new InvalidOperationException("Account is suspended.");

            var newRefreshToken = GenerateRefreshToken();
            var newRefreshTokenHash = HashRefreshToken(newRefreshToken);

            var expiresInDays = int.Parse(
                _configuration["Jwt:RefreshTokenExpiresInDays"] ?? "30");

            var newRefreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(expiresInDays);

            storedRefreshToken.RevokedAtUtc = DateTime.UtcNow;
            storedRefreshToken.ReplacedByTokenHash = newRefreshTokenHash;

            var newRefreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                TokenHash = newRefreshTokenHash,
                CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = newRefreshTokenExpiresAtUtc
            };

            await _context.RefreshTokens.AddAsync(newRefreshTokenEntity, cancellationToken);

            Guid? engineerPublicId = null;

            if (user.EngineerId.HasValue)
            {
                engineerPublicId = await _context.Engineers
                    .Where(x => x.Id == user.EngineerId.Value && !x.IsDeleted)
                    .Select(x => (Guid?)x.PublicId)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            var roles = await _userManager.GetRolesAsync(user);

            var activeDevice = await GetActiveDeviceForUserAsync(user, cancellationToken);

            var jwt = GenerateJwtToken(user, engineerPublicId, roles);

            await _context.SaveChangesAsync(cancellationToken);

            return new AuthResponse
            {
                UserId = user.Id,
                EngineerPublicId = engineerPublicId,
                DevicePublicId = activeDevice.DevicePublicId,
                DeviceName = activeDevice.DeviceName,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                Roles = roles.ToList(),
                Token = jwt.Token,
                ExpiresAtUtc = jwt.ExpiresAtUtc,
                RefreshToken = newRefreshToken,
                RefreshTokenExpiresAtUtc = newRefreshTokenExpiresAtUtc
            };
        }

        public async Task LogoutAsync(
    LogoutRequest request,
    CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken))
                throw new InvalidOperationException("Refresh token is required.");

            var refreshTokenHash = HashRefreshToken(request.RefreshToken);

            var storedRefreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(
                    x => x.TokenHash == refreshTokenHash,
                    cancellationToken);

            if (storedRefreshToken is null)
                throw new InvalidOperationException("Refresh token is expired or revoked.");

            if (storedRefreshToken.IsRevoked || storedRefreshToken.IsExpired)
                throw new InvalidOperationException("Refresh token is expired or revoked.");

            storedRefreshToken.RevokedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
        }

        private string GenerateRefreshToken()
        {
            var randomBytes = RandomNumberGenerator.GetBytes(64);

            return Convert.ToBase64String(randomBytes);
        }

        private string HashRefreshToken(string refreshToken)
        {
            var bytes = Encoding.UTF8.GetBytes(refreshToken);
            var hash = SHA256.HashData(bytes);

            return Convert.ToBase64String(hash);
        }

        private async Task<(string Token, DateTime ExpiresAtUtc)> CreateRefreshTokenAsync(
            ApplicationUser user,
            CancellationToken cancellationToken = default)
        {
            var refreshToken = GenerateRefreshToken();
            var refreshTokenHash = HashRefreshToken(refreshToken);

            var expiresInDays = int.Parse(
                _configuration["Jwt:RefreshTokenExpiresInDays"] ?? "30");

            var expiresAtUtc = DateTime.UtcNow.AddDays(expiresInDays);

            var entity = new RefreshToken
            {
                UserId = user.Id,
                TokenHash = refreshTokenHash,
                CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = expiresAtUtc
            };

            await _context.RefreshTokens.AddAsync(entity, cancellationToken);

            return (refreshToken, expiresAtUtc);
        }

        private async Task<AuthResponse> BuildAuthResponseAsync(
            ApplicationUser user,
            CancellationToken cancellationToken = default)
        {
            Guid? engineerPublicId = null;

            if (user.EngineerId.HasValue)
            {
                engineerPublicId = await _context.Engineers
                    .Where(x => x.Id == user.EngineerId.Value && !x.IsDeleted)
                    .Select(x => (Guid?)x.PublicId)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            var activeDevice = await GetActiveDeviceForUserAsync(user, cancellationToken);

            var roles = await _userManager.GetRolesAsync(user);

            var jwt = GenerateJwtToken(user, engineerPublicId, roles);

            var refreshToken = await CreateRefreshTokenAsync(user, cancellationToken);

            await _context.SaveChangesAsync(cancellationToken);

            return new AuthResponse
            {
                UserId = user.Id,
                EngineerPublicId = engineerPublicId,
                DevicePublicId = activeDevice.DevicePublicId,
                DeviceName = activeDevice.DeviceName,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                Roles = roles.ToList(),
                Token = jwt.Token,
                ExpiresAtUtc = jwt.ExpiresAtUtc,
                RefreshToken = refreshToken.Token,
                RefreshTokenExpiresAtUtc = refreshToken.ExpiresAtUtc
            };
        }

        private async Task<UserAccountResponse> BuildUserAccountResponseAsync(
    ApplicationUser user,
    CancellationToken cancellationToken = default)
        {
            Guid? engineerPublicId = null;

            if (user.EngineerId.HasValue)
            {
                engineerPublicId = await _context.Engineers
                    .Where(x => x.Id == user.EngineerId.Value && !x.IsDeleted)
                    .Select(x => (Guid?)x.PublicId)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            var roles = await _userManager.GetRolesAsync(user);

            return new UserAccountResponse
            {
                UserId = user.Id,
                EngineerPublicId = engineerPublicId,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                Roles = roles.ToList(),
                CreatedAtUtc = DateTime.UtcNow
            };
        }

        public async Task<UserAccountResponse> CreateFirstAdminAsync(
            CreateFirstAdminRequest request,
            CancellationToken cancellationToken = default)
        {
            await EnsureRoleExistsAsync(AppRoles.ADMIN);

            var admins = await _userManager.GetUsersInRoleAsync(AppRoles.ADMIN);

            if (admins.Any())
            {
                throw new InvalidOperationException("First admin already exists. Use an existing admin account to create more admins.");
            }

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

            var normalizedEmail = request.Email.Trim();

            var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);

            if (existingUser is not null)
                throw new InvalidOperationException("A user with this email already exists.");

            var displayName = string.IsNullOrWhiteSpace(request.UserName)
                ? normalizedEmail
                : request.UserName.Trim();

            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var user = new ApplicationUser
                {
                    UserName = string.IsNullOrWhiteSpace(request.UserName)
                        ? normalizedEmail
                        : request.UserName.Trim(),

                    Email = normalizedEmail,
                    FullName = displayName,
                    EmailConfirmed = true,
                    UserType = UserType.Admin,
                    EngineerId = null
                };

                var createUserResult = await _userManager.CreateAsync(user, request.Password);

                if (!createUserResult.Succeeded)
                {
                    var errors = string.Join(", ", createUserResult.Errors.Select(x => x.Description));
                    throw new InvalidOperationException(errors);
                }

                // Create Admin profile
                var adminProfile = new Admin
                {
                    UserId = user.Id,
                    FullName = user.FullName,
                    Email = user.Email
                };
                await _context.Admins.AddAsync(adminProfile, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                // Assign role
                await AssignSingleBusinessRoleAsync(user, AppRoles.ADMIN, cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                return await BuildUserAccountResponseAsync(user, cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        public async Task<UserAccountResponse> RegisterEngineerCompleteAsync(
            Guid performedByUserId,
            string performedByEmail,
            RegisterEngineerCompleteRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new InvalidOperationException("Full name is required.");

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new InvalidOperationException("Email is required.");

            if (string.IsNullOrWhiteSpace(request.Password))
                throw new InvalidOperationException("Password is required.");

            var email = request.Email.Trim().ToLowerInvariant();

            var existingUser = await _userManager.FindByEmailAsync(email);
            if (existingUser is not null)
                throw new InvalidOperationException("Email is already registered.");

            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                // 1. Create Engineer profile row
                var engineer = new Engineer
                {
                    FullName = request.FullName.Trim(),
                    PhoneNumber = request.PhoneNumber?.Trim(),
                    Email = email,
                    Status = request.Status
                };

                await _context.Engineers.AddAsync(engineer, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                // 2. Create ApplicationUser
                var user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = request.FullName.Trim(),
                    PhoneNumber = request.PhoneNumber?.Trim(),
                    UserType = UserType.Engineer,
                    EngineerId = engineer.Id
                };

                var createResult = await _userManager.CreateAsync(user, request.Password);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join(", ", createResult.Errors.Select(x => x.Description));
                    throw new InvalidOperationException(errors);
                }

                // 3. Set Engineer.UserId = applicationUser.Id
                engineer.UserId = user.Id;
                _context.Engineers.Update(engineer);
                await _context.SaveChangesAsync(cancellationToken);

                // 4. Assign Engineer role using existing helper
                await AssignSingleBusinessRoleAsync(user, AppRoles.ENGINEER, cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                var response = await BuildUserAccountResponseAsync(user, cancellationToken);

                await _auditLogService.CreateAsync(
                    new CreateAuditLogRequest
                    {
                        ActionType = AuditActionType.EngineerUserCreated,
                        PerformedByUserId = performedByUserId,
                        PerformedByEmail = performedByEmail,
                        EntityName = nameof(ApplicationUser),
                        EntityPublicId = user.Id,
                        Description = $"Admin created engineer user '{user.Email}'.",
                        MetadataJson = JsonSerializer.Serialize(new
                        {
                            createdUserId = user.Id,
                            engineerPublicId = response.EngineerPublicId,
                            user.Email,
                            user.FullName,
                            roles = response.Roles
                        })
                    },
                    cancellationToken);

                return response;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        private async Task AssignSingleBusinessRoleAsync(
            ApplicationUser user,
            string roleName,
            CancellationToken cancellationToken)
        {
            // 1. Verify user has no other roles assigned
            var existingRoles = await _userManager.GetRolesAsync(user);
            if (existingRoles.Any(r => r != roleName))
            {
                throw new InvalidOperationException($"User already has role(s): {string.Join(", ", existingRoles)}. A user can only have one business role.");
            }

            // 2. Verify UserType matches the roleName
            var expectedType = roleName switch
            {
                AppRoles.ADMIN => UserType.Admin,
                AppRoles.MANAGER => UserType.Manager,
                AppRoles.ENGINEER => UserType.Engineer,
                _ => UserType.Unknown
            };

            if (user.UserType != expectedType)
            {
                throw new InvalidOperationException($"UserType '{user.UserType}' does not match the assigned role '{roleName}'.");
            }

            // 3. Verify the corresponding profile exists
            if (roleName == AppRoles.ADMIN)
            {
                var adminExists = await _context.Admins.AnyAsync(a => a.UserId == user.Id, cancellationToken);
                if (!adminExists)
                {
                    throw new InvalidOperationException("Cannot assign Admin role: Admin profile does not exist.");
                }
            }
            else if (roleName == AppRoles.MANAGER)
            {
                var managerExists = await _context.Managers.AnyAsync(m => m.UserId == user.Id, cancellationToken);
                if (!managerExists)
                {
                    throw new InvalidOperationException("Cannot assign Manager role: Manager profile does not exist.");
                }
            }
            else if (roleName == AppRoles.ENGINEER)
            {
                if (!user.EngineerId.HasValue)
                {
                    throw new InvalidOperationException("Cannot assign Engineer role: EngineerId is not set.");
                }
                var engineerExists = await _context.Engineers.AnyAsync(e => e.Id == user.EngineerId.Value, cancellationToken);
                if (!engineerExists)
                {
                    throw new InvalidOperationException("Cannot assign Engineer role: Engineer profile does not exist.");
                }
            }

            // 4. Assign the role
            await EnsureRoleExistsAsync(roleName);
            var roleResult = await _userManager.AddToRoleAsync(user, roleName);
            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(x => x.Description));
                throw new InvalidOperationException(errors);
            }
        }
    }
}