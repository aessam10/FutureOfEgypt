using System.Text.Json.Serialization;

namespace FutureOfEgypt.Application.Features.Tracking
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum DeviceValidationStatus
    {
        Valid,
        EngineerInactive,
        DeviceNotRegistered,
        DeviceBlocked,
        DeviceInactive,
        DeviceAssignedToOther,
        PendingApproval,
        Rejected,
        DeviceNotAssigned
    }
}
