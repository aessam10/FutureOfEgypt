namespace FutureOfEgypt.Application.Features.EngineerDevices
{
    public sealed class EngineerDeviceResponse
    {
        public Guid PublicId { get; set; }

        public Guid EngineerPublicId { get; set; }

        public string EngineerName { get; set; } = string.Empty;

        public Guid DevicePublicId { get; set; }

        public string DeviceName { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        public DateTime AssignedAtUtc { get; set; }

        public DateTime? UnassignedAtUtc { get; set; }
    }
}