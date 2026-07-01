using System.Text.RegularExpressions;

namespace FutureOfEgypt.Application.Common.Helpers
{
    public static class UsernameValidator
    {
        private static readonly Regex UsernameRegex = new(
            "^[a-zA-Z0-9._-]{3,32}$",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        public static void Validate(string? username)
        {
            if (string.IsNullOrWhiteSpace(username))
                throw new InvalidOperationException("Username is required.");

            if (!UsernameRegex.IsMatch(username))
                throw new InvalidOperationException("Username must be 3-32 characters and may contain letters, numbers, dot, underscore, or hyphen only.");
        }
    }
}
