namespace FutureOfEgypt.Application.Features.Auth
{
    public interface IAuthService
    {
        Task<AuthResponse> RegisterAdminAsync(
            RegisterAdminRequest request,
            CancellationToken cancellationToken = default);

        Task<AuthResponse> RegisterEngineerUserAsync(
            RegisterEngineerUserRequest request,
            CancellationToken cancellationToken = default);

        Task<AuthResponse> LoginAsync(
            LoginRequest request,
            CancellationToken cancellationToken = default);
    }
}