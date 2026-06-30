namespace FutureOfEgypt.Application.Features.Auth
{
    public interface IAuthService
    {
        Task<UserAccountResponse> RegisterAdminAsync(
         Guid performedByUserId,
         string performedByEmail,
         RegisterAdminRequest request,
         CancellationToken cancellationToken = default);

        Task<UserAccountResponse> RegisterManagerAsync(
    Guid performedByUserId,
    string performedByEmail,
    RegisterAdminRequest request,
    CancellationToken cancellationToken = default);

        Task<UserAccountResponse> RegisterEngineerUserAsync(
            Guid performedByUserId,
            string performedByEmail,
            RegisterEngineerUserRequest request,
            CancellationToken cancellationToken = default);

        Task<AuthResponse> LoginAsync(
            LoginRequest request,
            CancellationToken cancellationToken = default);

        Task<AuthResponse> RefreshAsync(
            RefreshTokenRequest request,
            CancellationToken cancellationToken = default);

        Task LogoutAsync(
            LogoutRequest request,
            CancellationToken cancellationToken = default);
        Task<UserAccountResponse> CreateFirstAdminAsync(
            CreateFirstAdminRequest request,
            CancellationToken cancellationToken = default);
    }
}