using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class EngineerDeviceConfiguration : IEntityTypeConfiguration<EngineerDevice>
    {
        public void Configure(EntityTypeBuilder<EngineerDevice> builder)
        {
            builder.HasIndex(x => x.EngineerId)
                .IsUnique()
                .HasFilter("\"IsActive\" = true AND \"IsDeleted\" = false");

            builder.HasIndex(x => x.DeviceId)
                .IsUnique()
                .HasFilter("\"IsActive\" = true AND \"IsDeleted\" = false");
        }
    }
}