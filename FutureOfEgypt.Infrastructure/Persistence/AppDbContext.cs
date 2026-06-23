using FutureOfEgypt.Domain.Common;
using FutureOfEgypt.Domain.Entities;
using FutureOfEgypt.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FutureOfEgypt.Infrastructure.Persistence
{
    public class AppDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Engineer> Engineers { get; set; }

        public DbSet<Device> Devices { get; set; }

        public DbSet<EngineerDevice> EngineerDevices { get; set; }

        public DbSet<LocationHistory> LocationHistories { get; set; }

        public DbSet<DeviceLatestLocation> DeviceLatestLocations { get; set; }

        public DbSet<EngineerStatusHistory> EngineerStatusHistories { get; set; }

        public DbSet<DeviceAccessRequest> DeviceAccessRequests { get; set; }

        public DbSet<RefreshToken> RefreshTokens { get; set; }
            
        public DbSet<AuditLog> AuditLogs { get; set; }

        public DbSet<ChatConversation> ChatConversations { get; set; }

        public DbSet<ChatParticipant> ChatParticipants { get; set; }

        public DbSet<ChatMessage> ChatMessages { get; set; }

        public DbSet<EmailMessage> EmailMessages { get; set; }

        public DbSet<AppNotification> AppNotifications { get; set; }

        public DbSet<AppRelease> AppReleases { get; set; }

        public DbSet<DeviceAppStatus> DeviceAppStatuses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
                {
                    modelBuilder.Entity(entityType.ClrType)
                        .HasIndex(nameof(BaseEntity.PublicId))
                        .IsUnique();
                }
            }

            modelBuilder.Entity<EngineerStatusHistory>()
                .HasIndex(x => new { x.EngineerId, x.ChangedAtUtc });

            modelBuilder.Entity<EngineerStatusHistory>()
                .HasIndex(x => new { x.DeviceId, x.ChangedAtUtc });
        }
    }
}