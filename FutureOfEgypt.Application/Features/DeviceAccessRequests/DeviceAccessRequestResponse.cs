using FutureOfEgypt.Domain.Enums;

namespace FutureOfEgypt.Application.Features.DeviceAccessRequests
{
    public sealed class DeviceAccessRequestResponse
    {
        public Guid PublicId { get; set; }

        public Guid EngineerPublicId { get; set; }

        public string EngineerName { get; set; } = string.Empty;

        public string RequestedDeviceName { get; set; } = string.Empty;

        public string? MatchedDeviceName { get; set; }

        public Guid? MatchedDevicePublicId { get; set; }

        public string SerialNumber { get; set; } = string.Empty;

        public string? Imei { get; set; }

        public string? InstallationId { get; set; }

        public DevicePlatform Platform { get; set; }

        public DeviceAccessRequestStatus Status { get; set; }

        public DateTime RequestedAtUtc { get; set; }

        public DateTime? ReviewedAtUtc { get; set; }

        public Guid? ReviewedByUserId { get; set; }

        public string? ReviewNote { get; set; }

        public Guid? CreatedDevicePublicId { get; set; }
    }
}
