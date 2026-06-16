using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class DeviceLatestLocationConfiguration : IEntityTypeConfiguration<DeviceLatestLocation>
    {
        public void Configure(EntityTypeBuilder<DeviceLatestLocation> builder)
        {
            builder.HasIndex(x => x.DeviceId)
                .IsUnique();
        }
    }
}
