using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class DeviceConfiguration : IEntityTypeConfiguration<Device>
    {
        public void Configure(EntityTypeBuilder<Device> builder)
        {
            builder.Property(x => x.DeviceName)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(x => x.SerialNumber)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(x => x.Imei)
                .HasMaxLength(50);

            builder.Property(x => x.InstallationId)
                .HasMaxLength(100);

            builder.HasIndex(x => x.SerialNumber);

            builder.HasIndex(x => x.Imei);

            builder.HasIndex(x => x.InstallationId)
                .IsUnique()
                .HasFilter("\"InstallationId\" IS NOT NULL AND \"IsDeleted\" = false");
        }
    }
}
