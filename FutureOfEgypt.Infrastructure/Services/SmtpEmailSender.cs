using FutureOfEgypt.Application.Features.Email;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;

namespace FutureOfEgypt.Infrastructure.Services.Email
{
    public sealed class SmtpEmailSender : IEmailSender
    {
        private readonly SmtpEmailSettings _settings;

        public SmtpEmailSender(IOptions<SmtpEmailSettings> options)
        {
            _settings = options.Value;
        }

        public async Task<string?> SendAsync(
            string fromEmail,
            IReadOnlyList<string> toEmails,
            IReadOnlyList<string>? ccEmails,
            IReadOnlyList<string>? bccEmails,
            string subject,
            string body,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.Host))
                throw new InvalidOperationException("SMTP host is not configured.");

            if (string.IsNullOrWhiteSpace(_settings.UserName))
                throw new InvalidOperationException("SMTP username is not configured.");

            if (string.IsNullOrWhiteSpace(_settings.Password))
                throw new InvalidOperationException("SMTP password is not configured.");

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            foreach (var email in toEmails)
                message.To.Add(email);

            if (ccEmails is not null)
            {
                foreach (var email in ccEmails)
                    message.CC.Add(email);
            }

            if (bccEmails is not null)
            {
                foreach (var email in bccEmails)
                    message.Bcc.Add(email);
            }

            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                EnableSsl = _settings.EnableSsl,
                Credentials = new NetworkCredential(
                    _settings.UserName,
                    _settings.Password)
            };

            await client.SendMailAsync(message, cancellationToken);

            return null;
        }
    }
}