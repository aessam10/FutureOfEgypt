using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace FutureOfEgypt.Infrastructure.Identity
{
    public sealed class ApplicationUser : IdentityUser<Guid>
    {
        public string FullName { get; set; } = string.Empty;

        public UserType UserType { get; set; }

        public int? EngineerId { get; set; }

        public string? CompanyEmail { get; set; }

        public Engineer? Engineer { get; set; }

        public Manager? Manager { get; set; }

        public Admin? Admin { get; set; }

        public string? ProfilePhotoPath { get; set; }

        public bool IsSuspended { get; set; }

        public bool IsDeleted { get; set; }
    }
}