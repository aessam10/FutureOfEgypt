using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.Engineers
{
    public sealed class EngineerResponse
    {
        public Guid PublicId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public string? Email { get; set; }

        public EngineerStatus Status { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}