using System.Security.Claims;

namespace FutureOfEgypt.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static Guid GetUserId(this ClaimsPrincipal user)
        {
            var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? user.FindFirstValue("sub");

            if (string.IsNullOrWhiteSpace(value))
                throw new InvalidOperationException("User id is missing from token.");

            if (!Guid.TryParse(value, out var userId))
                throw new InvalidOperationException("Invalid user id in token.");

            return userId;
        }

        public static string GetUserEmail(this ClaimsPrincipal user)
        {
            return user.FindFirstValue(ClaimTypes.Email)
                   ?? user.FindFirstValue("email")
                   ?? string.Empty;
        }
    }
}
