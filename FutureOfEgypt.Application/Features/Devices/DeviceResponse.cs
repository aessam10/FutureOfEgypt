using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.Devices
{
    public sealed class DeviceResponse
    {
        public Guid PublicId { get; set; }

        public string DeviceName { get; set; } = string.Empty;

        public string SerialNumber { get; set; } = string.Empty;

        public string? Imei { get; set; }

        public string? InstallationId { get; set; }

        public DevicePlatform Platform { get; set; }

        public DeviceStatus Status { get; set; }

        public DateTime? LastSeenAtUtc { get; set; }

        public DateTime CreatedAt { get; set; }

        public string? AssignedEngineerName { get; set; }
    }
}