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

        public DbSet<Manager> Managers { get; set; }

        public DbSet<Admin> Admins { get; set; }

        public DbSet<Device> Devices { get; set; }

        public DbSet<EngineerDevice> EngineerDevices { get; set; }

        public DbSet<LocationHistory> LocationHistories { get; set; }

        public DbSet<DeviceLatestLocation> DeviceLatestLocations { get; set; }

        public DbSet<DeviceTrackingHealthStatus> DeviceTrackingHealthStatuses { get; set; }

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

        public DbSet<DeviceRecoveryEvent> DeviceRecoveryEvents { get; set; }

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

            modelBuilder.Entity<LocationHistory>()
                .HasIndex(x => new { x.DeviceId, x.ClientLocalId })
                .IsUnique()
                .HasFilter("ClientLocalId IS NOT NULL");

            modelBuilder.Entity<EngineerStatusHistory>()
                .HasIndex(x => new { x.EngineerId, x.ChangedAtUtc });

            modelBuilder.Entity<EngineerStatusHistory>()
                .HasIndex(x => new { x.DeviceId, x.ChangedAtUtc });

            modelBuilder.Entity<Manager>(entity =>
            {
                entity.HasOne<ApplicationUser>()
                    .WithOne(u => u.Manager)
                    .HasForeignKey<Manager>(m => m.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(m => m.UserId)
                    .IsUnique();
            });

            modelBuilder.Entity<Admin>(entity =>
            {
                entity.HasOne<ApplicationUser>()
                    .WithOne(u => u.Admin)
                    .HasForeignKey<Admin>(a => a.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(a => a.UserId)
                    .IsUnique();
            });

            modelBuilder.Entity<Engineer>(entity =>
            {
                entity.HasOne<ApplicationUser>()
                    .WithOne()
                    .HasForeignKey<Engineer>(e => e.UserId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasIndex(e => e.UserId)
                    .IsUnique()
                    .HasFilter("\"UserId\" IS NOT NULL");
            });

            modelBuilder.Entity<ApplicationUser>(entity =>
            {
                entity.Property(u => u.UserType)
                    .HasConversion<string>();

                entity.HasOne(u => u.Engineer)
                    .WithMany()
                    .HasForeignKey(u => u.EngineerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(u => u.EngineerId)
                    .IsUnique()
                    .HasFilter("\"EngineerId\" IS NOT NULL");
            });
        }
    }
}