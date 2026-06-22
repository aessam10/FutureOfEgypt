namespace FutureOfEgypt.Domain.Enums
{
    public enum AuditActionType
    {
        EngineerCreated = 1,
        DeviceCreated = 2,
        DeviceAssignedToEngineer = 3,
        DeviceAccessRequestApproved = 4,
        DeviceAccessRequestRejected = 5,
        EngineerSuspended = 6,
        EngineerActivated = 7,
        DeviceBlocked = 8,
        DeviceActivated = 9,
        Login = 10,
        Logout = 11,
        EngineerInactivated = 12,
        DeviceInactivated = 13,
        DeviceMarkedLost = 14,
        AdminUserCreated = 15,
        EngineerUserCreated = 16,
        DeviceLocationHidden = 17,
        DeviceLocationUnhidden = 18
    }
}
