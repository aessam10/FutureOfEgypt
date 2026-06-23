using FutureOfEgypt.Extensions;
using FutureOfEgypt.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace FutureOfEgypt.Middleware
{
    public class ActiveUserMiddleware
    {
        private readonly RequestDelegate _next;

        public ActiveUserMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, UserManager<ApplicationUser> userManager)
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var userIdString = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (Guid.TryParse(userIdString, out var userId))
                {
                    var user = await userManager.FindByIdAsync(userId.ToString());
                    
                    if (user == null || user.IsDeleted || user.IsSuspended)
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsJsonAsync(new { message = "Account is suspended or deleted." });
                        return;
                    }
                }
            }

            await _next(context);
        }
    }

    public static class ActiveUserMiddlewareExtensions
    {
        public static IApplicationBuilder UseActiveUserCheck(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<ActiveUserMiddleware>();
        }
    }
}
