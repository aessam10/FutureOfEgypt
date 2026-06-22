using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class DeviceAppStatusConfiguration : IEntityTypeConfiguration<DeviceAppStatus>
    {
        public void Configure(EntityTypeBuilder<DeviceAppStatus> builder)
        {
            builder.Property(x => x.InstallationId)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.Platform)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.AppVersionName)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.LastError)
                .HasMaxLength(2000);

            // Platform + InstallationId should be unique
            builder.HasIndex(x => new { x.Platform, x.InstallationId })
                .IsUnique()
                .HasFilter("\"IsDeleted\" = false");

            builder.HasIndex(x => x.InstallationId);

            builder.HasOne(x => x.Device)
                .WithMany()
                .HasForeignKey(x => x.DeviceId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(x => x.Engineer)
                .WithMany()
                .HasForeignKey(x => x.EngineerId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
