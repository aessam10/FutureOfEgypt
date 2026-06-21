namespace FutureOfEgypt.Application.Features.Tracking
{
    public sealed class DeviceValidationResponse
    {
        public DeviceValidationStatus Status { get; set; }
        public Guid? DevicePublicId { get; set; }
        public string? DeviceName { get; set; }

        /// <summary>
        /// Populated when Status == Rejected, contains the admin review note if available.
        /// </summary>
        public string? ReviewNote { get; set; }
    }
}
