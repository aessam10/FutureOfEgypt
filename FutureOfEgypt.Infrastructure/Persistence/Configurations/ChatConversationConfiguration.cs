using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class ChatConversationConfiguration : IEntityTypeConfiguration<ChatConversation>
    {
        public void Configure(EntityTypeBuilder<ChatConversation> builder)
        {
            builder.Property(x => x.Title)
                .HasMaxLength(200);

            builder.Property(x => x.Type)
                .IsRequired();

            builder.Property(x => x.CreatedByUserId)
                .IsRequired();

            builder.Property(x => x.LastMessageAtUtc)
                .IsRequired();

            builder.HasIndex(x => x.PublicId)
                .IsUnique();

            builder.HasIndex(x => x.Type);

            builder.HasIndex(x => x.LastMessageAtUtc);

            builder.HasIndex(x => x.CreatedByUserId);
        }
    }
}
