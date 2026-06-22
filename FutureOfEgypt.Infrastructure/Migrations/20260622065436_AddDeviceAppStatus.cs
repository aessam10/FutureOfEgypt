using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceAppStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeviceAppStatuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DeviceId = table.Column<int>(type: "integer", nullable: true),
                    EngineerId = table.Column<int>(type: "integer", nullable: true),
                    InstallationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AppVersionName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AppVersionCode = table.Column<int>(type: "integer", nullable: false),
                    LatestVersionCode = table.Column<int>(type: "integer", nullable: true),
                    MinimumRecommendedVersionCode = table.Column<int>(type: "integer", nullable: true),
                    MinimumRequiredVersionCode = table.Column<int>(type: "integer", nullable: true),
                    MinimumMandatoryVersionCode = table.Column<int>(type: "integer", nullable: true),
                    UpdateLevel = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    LastCheckedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastReportedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUpdatePromptShownAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUpdateStartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUpdateFailedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastError = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RequiredReleasePublicId = table.Column<Guid>(type: "uuid", nullable: true),
                    PublicId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceAppStatuses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceAppStatuses_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DeviceAppStatuses_Engineers_EngineerId",
                        column: x => x.EngineerId,
                        principalTable: "Engineers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAppStatuses_DeviceId",
                table: "DeviceAppStatuses",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAppStatuses_EngineerId",
                table: "DeviceAppStatuses",
                column: "EngineerId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAppStatuses_InstallationId",
                table: "DeviceAppStatuses",
                column: "InstallationId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAppStatuses_Platform_InstallationId",
                table: "DeviceAppStatuses",
                columns: new[] { "Platform", "InstallationId" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAppStatuses_PublicId",
                table: "DeviceAppStatuses",
                column: "PublicId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeviceAppStatuses");
        }
    }
}
