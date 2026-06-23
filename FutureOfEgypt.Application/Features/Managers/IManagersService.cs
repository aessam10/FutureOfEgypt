using FutureOfEgypt.Application.Common.Models;

namespace FutureOfEgypt.Application.Features.Managers
{
    public interface IManagersService
    {
        Task<PagedResponse<ManagerResponse>> GetManagersAsync(int pageNumber, int pageSize, string? search, CancellationToken cancellationToken = default);
        Task<ManagerResponse> UpdateManagerAsync(Guid adminId, string adminEmail, Guid managerId, UpdateManagerRequest request, CancellationToken cancellationToken = default);
        Task<ManagerResponse> SuspendManagerAsync(Guid adminId, string adminEmail, Guid managerId, CancellationToken cancellationToken = default);
        Task<ManagerResponse> ActivateManagerAsync(Guid adminId, string adminEmail, Guid managerId, CancellationToken cancellationToken = default);
        Task DeleteManagerAsync(Guid adminId, string adminEmail, Guid managerId, CancellationToken cancellationToken = default);
    }
}
