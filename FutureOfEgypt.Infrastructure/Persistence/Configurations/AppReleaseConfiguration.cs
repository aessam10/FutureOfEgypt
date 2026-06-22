using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class AppReleaseConfiguration : IEntityTypeConfiguration<AppRelease>
    {
        public void Configure(EntityTypeBuilder<AppRelease> builder)
        {
            builder.Property(x => x.Platform)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.VersionName)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.ApkFileName)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(x => x.ApkDownloadUrl)
                .IsRequired()
                .HasMaxLength(2000);

            builder.Property(x => x.ApkSha256)
                .IsRequired()
                .HasMaxLength(64);

            builder.Property(x => x.ReleaseNotes)
                .HasMaxLength(4000);

            // Only one active release per platform at a time
            builder.HasIndex(x => new { x.Platform, x.IsActive });

            builder.HasIndex(x => x.VersionCode);
        }
    }
}
