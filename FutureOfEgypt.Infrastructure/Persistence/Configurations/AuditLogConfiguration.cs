using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
    {
        public void Configure(EntityTypeBuilder<AuditLog> builder)
        {
            builder.Property(x => x.PerformedByEmail)
                .HasMaxLength(256);

            builder.Property(x => x.EntityName)
                .HasMaxLength(150)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(1000)
                .IsRequired();

            builder.HasIndex(x => x.ActionType);

            builder.HasIndex(x => x.PerformedByUserId);

            builder.HasIndex(x => x.EntityName);

            builder.HasIndex(x => x.EntityPublicId);

            builder.HasIndex(x => x.PerformedAtUtc);
        }
    }
}
