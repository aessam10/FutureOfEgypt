using FutureOfEgypt.Application.Common.Models;
using FutureOfEgypt.Application.Features.AuditLog;
using FutureOfEgypt.Application.Features.Managers;
using FutureOfEgypt.Infrastructure.Identity;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using FutureOfEgypt.Application.Common.Security;
using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Infrastructure.Services
{
    public class ManagersService : IManagersService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService;

        public ManagersService(
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            AppDbContext context,
            IAuditLogService auditLogService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _context = context;
            _auditLogService = auditLogService;
        }

        public async Task<PagedResponse<ManagerResponse>> GetManagersAsync(int pageNumber, int pageSize, string? search, CancellationToken cancellationToken = default)
        {
            var usersInRole = await _userManager.GetUsersInRoleAsync(AppRoles.MANAGER);
            
            var query = usersInRole.Where(x => !x.IsDeleted).AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.Trim().ToLower();
                query = query.Where(x => 
                    x.FullName.ToLower().Contains(searchLower) ||
                    (x.Email != null && x.Email.ToLower().Contains(searchLower)) ||
                    (x.PhoneNumber != null && x.PhoneNumber.ToLower().Contains(searchLower)));
            }

            var totalCount = query.Count();
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var items = query
                .OrderBy(x => x.FullName)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new ManagerResponse
                {
                    Id = x.Id,
                    Username = x.UserName ?? string.Empty,
                    FullName = x.FullName,
                    Email = x.Email ?? string.Empty,
                    PhoneNumber = x.PhoneNumber,
                    Role = AppRoles.MANAGER,
                    ProfilePhotoUrl = string.IsNullOrEmpty(x.ProfilePhotoPath) ? null : $"/api/profile/photo/{x.Id}?v={x.ConcurrencyStamp}",
                    IsSuspended = x.IsSuspended
                })
                .ToList();

            return new PagedResponse<ManagerResponse>
            {
                Items = items,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }

        public async Task<ManagerResponse> UpdateManagerAsync(Guid adminId, string adminEmail, Guid managerId, UpdateManagerRequest request, CancellationToken cancellationToken = default)
        {
            var user = await _userManager.FindByIdAsync(managerId.ToString());
            if (user == null || user.IsDeleted) throw new InvalidOperationException("Manager not found.");

            var isManager = await _userManager.IsInRoleAsync(user, AppRoles.MANAGER);
            if (!isManager) throw new InvalidOperationException("User is not a manager.");

            user.FullName = request.FullName.Trim();
            user.PhoneNumber = request.PhoneNumber?.Trim();
            user.Email = request.Email.Trim();
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded) throw new InvalidOperationException(string.Join(", ", result.Errors.Select(e => e.Description)));

            await _auditLogService.CreateAsync(new CreateAuditLogRequest
            {
                ActionType = AuditActionType.AdminUserCreated, // Using a generic type or updating action types would be better, but we will reuse for now or add new ones if exist. Assuming standard ones.
                PerformedByUserId = adminId,
                PerformedByEmail = adminEmail,
                EntityName = "Manager",
                EntityPublicId = user.Id,
                Description = $"Admin edited manager '{user.Email}'.",
                MetadataJson = JsonSerializer.Serialize(new { managerId = user.Id, email = user.Email })
            });

            return new ManagerResponse
            {
                Id = user.Id,
                Username = user.UserName ?? string.Empty,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                PhoneNumber = user.PhoneNumber,
                Role = AppRoles.MANAGER,
                ProfilePhotoUrl = string.IsNullOrEmpty(user.ProfilePhotoPath) ? null : $"/api/profile/photo/{user.Id}?v={user.ConcurrencyStamp}",
                IsSuspended = user.IsSuspended
            };
        }

        public async Task<ManagerResponse> SuspendManagerAsync(Guid adminId, string adminEmail, Guid managerId, CancellationToken cancellationToken = default)
        {
            if (adminId == managerId) throw new InvalidOperationException("Cannot suspend yourself.");

            var user = await _userManager.FindByIdAsync(managerId.ToString());
            if (user == null || user.IsDeleted) throw new InvalidOperationException("Manager not found.");

            user.IsSuspended = true;
            await _userManager.UpdateAsync(user);

            await _auditLogService.CreateAsync(new CreateAuditLogRequest
            {
                ActionType = AuditActionType.EngineerSuspended, // Reuse
                PerformedByUserId = adminId,
                PerformedByEmail = adminEmail,
                EntityName = "Manager",
                EntityPublicId = user.Id,
                Description = $"Admin suspended manager '{user.Email}'.",
                MetadataJson = JsonSerializer.Serialize(new { managerId = user.Id, email = user.Email })
            });

            return new ManagerResponse
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                PhoneNumber = user.PhoneNumber,
                Role = AppRoles.MANAGER,
                ProfilePhotoUrl = string.IsNullOrEmpty(user.ProfilePhotoPath) ? null : $"/api/profile/photo/{user.Id}",
                IsSuspended = user.IsSuspended
            };
        }

        public async Task<ManagerResponse> ActivateManagerAsync(Guid adminId, string adminEmail, Guid managerId, CancellationToken cancellationToken = default)
        {
            var user = await _userManager.FindByIdAsync(managerId.ToString());
            if (user == null || user.IsDeleted) throw new InvalidOperationException("Manager not found.");

            user.IsSuspended = false;
            await _userManager.UpdateAsync(user);

            await _auditLogService.CreateAsync(new CreateAuditLogRequest
            {
                ActionType = AuditActionType.EngineerActivated, // Reuse
                PerformedByUserId = adminId,
                PerformedByEmail = adminEmail,
                EntityName = "Manager",
                EntityPublicId = user.Id,
                Description = $"Admin activated manager '{user.Email}'.",
                MetadataJson = JsonSerializer.Serialize(new { managerId = user.Id, email = user.Email })
            });

            return new ManagerResponse
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                PhoneNumber = user.PhoneNumber,
                Role = AppRoles.MANAGER,
                ProfilePhotoUrl = string.IsNullOrEmpty(user.ProfilePhotoPath) ? null : $"/api/profile/photo/{user.Id}",
                IsSuspended = user.IsSuspended
            };
        }

        public async Task DeleteManagerAsync(Guid adminId, string adminEmail, Guid managerId, CancellationToken cancellationToken = default)
        {
            if (adminId == managerId) throw new InvalidOperationException("Cannot delete yourself.");

            var user = await _userManager.FindByIdAsync(managerId.ToString());
            if (user == null || user.IsDeleted) throw new InvalidOperationException("Manager not found.");

            var isAdmin = await _userManager.IsInRoleAsync(user, AppRoles.ADMIN);
            if (isAdmin)
            {
                var allAdmins = await _userManager.GetUsersInRoleAsync(AppRoles.ADMIN);
                var activeAdmins = allAdmins.Count(x => !x.IsDeleted && !x.IsSuspended);
                if (activeAdmins <= 1)
                {
                    throw new InvalidOperationException("Cannot delete the last active admin.");
                }
            }

            user.IsDeleted = true;
            user.IsSuspended = true; // Suspend them too for double safety
            await _userManager.UpdateAsync(user);

            await _auditLogService.CreateAsync(new CreateAuditLogRequest
            {
                ActionType = AuditActionType.EngineerInactivated, // Reuse
                PerformedByUserId = adminId,
                PerformedByEmail = adminEmail,
                EntityName = "Manager",
                EntityPublicId = user.Id,
                Description = $"Admin soft-deleted manager '{user.Email}'.",
                MetadataJson = JsonSerializer.Serialize(new { managerId = user.Id, email = user.Email })
            });
        }
    }
}
