namespace FutureOfEgypt.Application.Features.EngineerDevices
{
    public interface IEngineerDeviceService
    {
        Task<EngineerDeviceResponse> AssignDeviceAsync(
            AssignDeviceRequest request,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<EngineerDeviceResponse>> GetAssignmentsAsync(
            CancellationToken cancellationToken = default);
        Task<IReadOnlyList<EngineerDeviceResponse>> GetActiveAssignmentsAsync(
    CancellationToken cancellationToken = default);
    }
}