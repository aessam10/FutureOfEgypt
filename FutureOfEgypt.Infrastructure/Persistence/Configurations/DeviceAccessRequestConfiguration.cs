using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class DeviceAccessRequestConfiguration : IEntityTypeConfiguration<DeviceAccessRequest>
    {
        public void Configure(EntityTypeBuilder<DeviceAccessRequest> builder)
        {
            builder.HasIndex(x => x.EngineerId);

            builder.HasIndex(x => x.SerialNumber);

            builder.HasIndex(x => x.Status);

            builder.HasOne(x => x.Engineer)
                .WithMany()
                .HasForeignKey(x => x.EngineerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.CreatedDevice)
                .WithMany()
                .HasForeignKey(x => x.CreatedDeviceId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(x => new { x.EngineerId, x.InstallationId, x.Status })
                .IsUnique()
                .HasFilter("\"InstallationId\" IS NOT NULL AND \"Status\" = 1 AND \"IsDeleted\" = false");

            builder.Property(x => x.InstallationId).HasMaxLength(100);

            builder.HasIndex(x => x.InstallationId);
        }
    }
}
