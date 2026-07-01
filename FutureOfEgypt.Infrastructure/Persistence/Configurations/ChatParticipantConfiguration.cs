using FutureOfEgypt.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FutureOfEgypt.Infrastructure.Persistence.Configurations
{
    public sealed class ChatParticipantConfiguration : IEntityTypeConfiguration<ChatParticipant>
    {
        public void Configure(EntityTypeBuilder<ChatParticipant> builder)
        {
            builder.Property(x => x.UserId)
                .IsRequired();

            builder.Property(x => x.Role)
                .IsRequired();

            builder.Property(x => x.JoinedAtUtc)
                .IsRequired();

            builder.HasOne(x => x.Conversation)
                .WithMany(x => x.Participants)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.LastReadMessage)
                .WithMany()
                .HasForeignKey(x => x.LastReadMessageId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(x => x.PublicId)
                .IsUnique();

            builder.HasIndex(x => x.ConversationId);

            builder.HasIndex(x => x.UserId);

            builder.HasIndex(x => new { x.ConversationId, x.UserId })
                .IsUnique()
                .HasFilter("\"IsDeleted\" = false");

            builder.HasIndex(x => new { x.UserId, x.LeftAtUtc });

            builder.HasIndex(x => new { x.UserId, x.IsArchived });
        }
    }
}