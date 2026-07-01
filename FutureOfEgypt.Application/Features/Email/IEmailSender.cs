namespace FutureOfEgypt.Application.Features.Email
{
    public interface IEmailSender
    {
        Task<string?> SendAsync(
            string fromEmail,
            IReadOnlyList<string> toEmails,
            IReadOnlyList<string>? ccEmails,
            IReadOnlyList<string>? bccEmails,
            string subject,
            string body,
            CancellationToken cancellationToken = default);
    }
}
