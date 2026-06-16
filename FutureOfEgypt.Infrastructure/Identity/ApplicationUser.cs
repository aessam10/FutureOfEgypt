using FutureOfEgypt.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace FutureOfEgypt.Infrastructure.Identity
{
    public sealed class ApplicationUser : IdentityUser<Guid>
    {
        public string FullName { get; set; } = string.Empty;

        public int? EngineerId { get; set; }

        public Engineer? Engineer { get; set; }
    }
}