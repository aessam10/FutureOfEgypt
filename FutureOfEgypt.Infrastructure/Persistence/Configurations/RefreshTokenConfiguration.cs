using FutureOfEgypt.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
    {
        public void Configure(EntityTypeBuilder<RefreshToken> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.TokenHash)
                .IsRequired();

            builder.HasIndex(x => x.TokenHash)
                .IsUnique();

            builder.HasIndex(x => x.UserId);

            builder.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
