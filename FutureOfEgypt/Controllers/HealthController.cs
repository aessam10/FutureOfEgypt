using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FutureOfEgypt.Infrastructure.Persistence;
using FutureOfEgypt.Infrastructure.Identity;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace FutureOfEgypt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class HealthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public HealthController(AppDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

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

        [AllowAnonymous]
        [HttpGet("preflight")]
        public async Task<IActionResult> GetPreflightReport()
        {
            var userRolesGrouped = await _context.UserRoles
                .GroupBy(ur => ur.UserId)
                .Select(g => new { UserId = g.Key, RoleCount = g.Count() })
                .ToListAsync();

            var multipleRoleUserIds = userRolesGrouped
                .Where(x => x.RoleCount > 1)
                .Select(x => x.UserId)
                .ToList();

            var multipleRoles = await _context.Users
                .Where(u => multipleRoleUserIds.Contains(u.Id))
                .Select(u => new { u.Id, u.Email, u.FullName })
                .ToListAsync();

            var noRoles = await _context.Users
                .Where(u => !_context.UserRoles.Any(ur => ur.UserId == u.Id))
                .Select(u => new { u.Id, u.Email, u.FullName })
                .ToListAsync();

            var engineerRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == "Engineer");
            
            var engineersWithoutLink = new List<object>();
            if (engineerRole != null)
            {
                var engineerUserIds = await _context.UserRoles
                    .Where(ur => ur.RoleId == engineerRole.Id)
                    .Select(ur => ur.UserId)
                    .ToListAsync();

                var users = await _context.Users
                    .Where(u => engineerUserIds.Contains(u.Id) && u.EngineerId == null)
                    .Select(u => new { u.Id, u.Email, u.FullName })
                    .ToListAsync();

                engineersWithoutLink.AddRange(users);
            }

            var allUsersWithRoles = await (from u in _context.Users
                                           join ur in _context.UserRoles on u.Id equals ur.UserId into urGroup
                                           from ur in urGroup.DefaultIfEmpty()
                                           join r in _context.Roles on ur.RoleId equals r.Id into rGroup
                                           from r in rGroup.DefaultIfEmpty()
                                           select new
                                           {
                                               u.Id,
                                               u.Email,
                                               u.FullName,
                                               RoleName = r != null ? r.Name : "No Role",
                                               u.EngineerId
                                           }).ToListAsync();

            var roleSummary = allUsersWithRoles
                .GroupBy(x => x.RoleName)
                .ToDictionary(g => g.Key ?? "No Role", g => g.Count());

            return Ok(new
            {
                multipleRoles,
                noRoles,
                engineersWithoutLink,
                roleSummary,
                details = allUsersWithRoles
            });
        }
    }
}
