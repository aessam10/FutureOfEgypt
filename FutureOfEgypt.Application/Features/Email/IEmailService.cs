namespace FutureOfEgypt.Application.Features.Email
{
    public interface IEmailService
    {
        Task<EmailMessageResponse> SendAsync(
            Guid senderUserId,
            string senderEmail,
            SendEmailRequest request,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<EmailMessageResponse>> GetAllAsync(
            CancellationToken cancellationToken = default);

        Task<EmailMessageResponse> GetByPublicIdAsync(
            Guid publicId,
            CancellationToken cancellationToken = default);
    }
}
