using FutureOfEgypt.Application.Features.Email;
using FutureOfEgypt.Application.Features.Email.FutureOfEgypt.Application.Features.Emails;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Domain.Enums;
using FutureOfEgypt.Infrastructure.Identity;
using FutureOfEgypt.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Services
{
    public sealed class EmailService : IEmailService
    {
        private readonly AppDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailSender _emailSender;
        public EmailService(
            AppDbContext context,
            UserManager<ApplicationUser> userManager,
            IEmailSender emailSender)
        {
            _context = context;
            _userManager = userManager;
            _emailSender = emailSender;
        }

        public async Task<EmailMessageResponse> SendAsync(
            Guid senderUserId,
            string senderEmail,
            SendEmailRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request.ToEmails is null || request.ToEmails.Count == 0)
                throw new InvalidOperationException("At least one recipient email is required.");

            if (string.IsNullOrWhiteSpace(request.Subject))
                throw new InvalidOperationException("Subject is required.");

            if (string.IsNullOrWhiteSpace(request.Body))
                throw new InvalidOperationException("Body is required.");

            var sender = await _userManager.FindByIdAsync(senderUserId.ToString());

            if (sender is null)
                throw new InvalidOperationException("Sender user does not exist.");

            var fromEmail = sender.CompanyEmail;

            if (string.IsNullOrWhiteSpace(fromEmail))
                throw new InvalidOperationException("Sender company email is missing.");

            var entity = new EmailMessage
            {
                SenderUserId = sender.Id,
                SenderFullName = sender.FullName,
                FromEmail = fromEmail,
                ToEmails = NormalizeEmails(request.ToEmails),
                CcEmails = NormalizeOptionalEmails(request.CcEmails),
                BccEmails = NormalizeOptionalEmails(request.BccEmails),
                Subject = request.Subject.Trim(),
                Body = request.Body.Trim(),
                Status = EmailMessageStatus.Queued
            };

            await _context.EmailMessages.AddAsync(entity, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            try
            {
                var providerMessageId = await _emailSender.SendAsync(
                    entity.FromEmail,
                    SplitEmails(entity.ToEmails),
                    SplitOptionalEmails(entity.CcEmails),
                    SplitOptionalEmails(entity.BccEmails),
                    entity.Subject,
                    entity.Body,
                    cancellationToken);

                entity.Status = EmailMessageStatus.Sent;
                entity.ProviderMessageId = providerMessageId;
                entity.SentAtUtc = DateTime.UtcNow;
                entity.ErrorMessage = null;
            }
            catch (Exception ex)
            {
                entity.Status = EmailMessageStatus.Failed;
                entity.ErrorMessage = ex.Message;
            }

            await _context.SaveChangesAsync(cancellationToken);

            return MapToResponse(entity);
        }

        public async Task<IReadOnlyList<EmailMessageResponse>> GetAllAsync(
            CancellationToken cancellationToken = default)
        {
            return await _context.EmailMessages
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAt)
                .Take(100)
                .Select(x => new EmailMessageResponse
                {
                    PublicId = x.PublicId,
                    SenderUserId = x.SenderUserId,
                    SenderFullName = x.SenderFullName,
                    FromEmail = x.FromEmail,
                    ToEmails = x.ToEmails,
                    CcEmails = x.CcEmails,
                    BccEmails = x.BccEmails,
                    Subject = x.Subject,
                    Body = x.Body,
                    Status = x.Status,
                    ProviderMessageId = x.ProviderMessageId,
                    ErrorMessage = x.ErrorMessage,
                    SentAtUtc = x.SentAtUtc,
                    CreatedAtUtc = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<EmailMessageResponse> GetByPublicIdAsync(
            Guid publicId,
            CancellationToken cancellationToken = default)
        {
            var entity = await _context.EmailMessages
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PublicId == publicId, cancellationToken);

            if (entity is null)
                throw new InvalidOperationException("Email message does not exist.");

            return MapToResponse(entity);
        }

        private static string NormalizeEmails(IEnumerable<string> emails)
        {
            var cleanedEmails = emails
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();

            if (cleanedEmails.Count == 0)
                throw new InvalidOperationException("At least one valid recipient email is required.");

            return string.Join(", ", cleanedEmails);
        }

        private static string? NormalizeOptionalEmails(IEnumerable<string>? emails)
        {
            if (emails is null)
                return null;

            var cleanedEmails = emails
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();

            return cleanedEmails.Count == 0
                ? null
                : string.Join(", ", cleanedEmails);
        }

        private static EmailMessageResponse MapToResponse(EmailMessage entity)
        {
            return new EmailMessageResponse
            {
                PublicId = entity.PublicId,
                SenderUserId = entity.SenderUserId,
                SenderFullName = entity.SenderFullName,
                FromEmail = entity.FromEmail,
                ToEmails = entity.ToEmails,
                CcEmails = entity.CcEmails,
                BccEmails = entity.BccEmails,
                Subject = entity.Subject,
                Body = entity.Body,
                Status = entity.Status,
                ProviderMessageId = entity.ProviderMessageId,
                ErrorMessage = entity.ErrorMessage,
                SentAtUtc = entity.SentAtUtc,
                CreatedAtUtc = entity.CreatedAt
            };
        }
        private static IReadOnlyList<string> SplitEmails(string emails)
        {
            return emails
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToList();
        }

        private static IReadOnlyList<string>? SplitOptionalEmails(string? emails)
        {
            if (string.IsNullOrWhiteSpace(emails))
                return null;

            var result = SplitEmails(emails);

            return result.Count == 0 ? null : result;
        }
    }
}