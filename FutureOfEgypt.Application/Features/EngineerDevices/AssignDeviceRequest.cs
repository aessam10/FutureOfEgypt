namespace FutureOfEgypt.Application.Features.EngineerDevices
{
    public sealed class AssignDeviceRequest
    {
        public Guid EngineerPublicId { get; set; }

        public Guid DevicePublicId { get; set; }
    }
}