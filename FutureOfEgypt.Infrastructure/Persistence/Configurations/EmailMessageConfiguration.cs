using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class EmailMessageConfiguration : IEntityTypeConfiguration<EmailMessage>
    {
        public void Configure(EntityTypeBuilder<EmailMessage> builder)
        {
            builder.ToTable("EmailMessages");

            builder.Property(x => x.SenderFullName)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.FromEmail)
                .HasMaxLength(320)
                .IsRequired();

            builder.Property(x => x.ToEmails)
                .HasMaxLength(2000)
                .IsRequired();

            builder.Property(x => x.CcEmails)
                .HasMaxLength(2000);

            builder.Property(x => x.BccEmails)
                .HasMaxLength(2000);

            builder.Property(x => x.Subject)
                .HasMaxLength(500)
                .IsRequired();

            builder.Property(x => x.Body)
                .IsRequired();

            builder.Property(x => x.ProviderMessageId)
                .HasMaxLength(500);

            builder.Property(x => x.ErrorMessage)
                .HasMaxLength(2000);

            builder.HasIndex(x => x.SenderUserId);

            builder.HasIndex(x => x.Status);

            builder.HasIndex(x => x.SentAtUtc);
        }
    }
}
