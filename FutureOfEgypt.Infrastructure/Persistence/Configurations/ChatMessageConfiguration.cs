using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
    {
        public void Configure(EntityTypeBuilder<ChatMessage> builder)
        {
            builder.Property(x => x.MessageText)
                .IsRequired()
                .HasMaxLength(4000);

            builder.Property(x => x.Type)
                .IsRequired();

            builder.Property(x => x.SentAtUtc)
                .IsRequired();

            builder.HasOne(x => x.Conversation)
                .WithMany(x => x.Messages)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(x => x.PublicId)
                .IsUnique();

            builder.HasIndex(x => x.ConversationId);

            builder.HasIndex(x => x.SenderUserId);

            builder.HasIndex(x => new { x.ConversationId, x.SentAtUtc });
        }
    }
}
