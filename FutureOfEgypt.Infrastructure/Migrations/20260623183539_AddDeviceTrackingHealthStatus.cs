using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceTrackingHealthStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeviceTrackingHealthStatuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DeviceId = table.Column<int>(type: "integer", nullable: false),
                    EngineerId = table.Column<int>(type: "integer", nullable: false),
                    TrackingStatusReason = table.Column<string>(type: "text", nullable: true),
                    LastHealthReportAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    HealthAuthState = table.Column<string>(type: "text", nullable: true),
                    LocationPermissionState = table.Column<string>(type: "text", nullable: true),
                    LocationServiceEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    BackgroundPermissionState = table.Column<string>(type: "text", nullable: true),
                    BatteryOptimizationState = table.Column<string>(type: "text", nullable: true),
                    InternetAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    PublicId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceTrackingHealthStatuses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceTrackingHealthStatuses_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeviceTrackingHealthStatuses_Engineers_EngineerId",
                        column: x => x.EngineerId,
                        principalTable: "Engineers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceTrackingHealthStatuses_DeviceId",
                table: "DeviceTrackingHealthStatuses",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceTrackingHealthStatuses_EngineerId",
                table: "DeviceTrackingHealthStatuses",
                column: "EngineerId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceTrackingHealthStatuses_PublicId",
                table: "DeviceTrackingHealthStatuses",
                column: "PublicId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeviceTrackingHealthStatuses");
        }
    }
}
