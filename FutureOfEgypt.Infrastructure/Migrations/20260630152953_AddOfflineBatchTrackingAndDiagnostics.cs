using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOfflineBatchTrackingAndDiagnostics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LocationHistories_DeviceId",
                table: "LocationHistories");

            migrationBuilder.AddColumn<string>(
                name: "ClientLocalId",
                table: "LocationHistories",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DeviceRecoveryEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DeviceId = table.Column<int>(type: "integer", nullable: false),
                    EngineerId = table.Column<int>(type: "integer", nullable: false),
                    RecoveryReason = table.Column<string>(type: "text", nullable: false),
                    FromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ToUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UploadedPointsCount = table.Column<int>(type: "integer", nullable: false),
                    DroppedPointsCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PublicId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceRecoveryEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceRecoveryEvents_Devices_DeviceId",
                        column: x => x.DeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeviceRecoveryEvents_Engineers_EngineerId",
                        column: x => x.EngineerId,
                        principalTable: "Engineers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LocationHistories_DeviceId_ClientLocalId",
                table: "LocationHistories",
                columns: new[] { "DeviceId", "ClientLocalId" },
                unique: true,
                filter: "ClientLocalId IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceRecoveryEvents_DeviceId",
                table: "DeviceRecoveryEvents",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceRecoveryEvents_EngineerId",
                table: "DeviceRecoveryEvents",
                column: "EngineerId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceRecoveryEvents_PublicId",
                table: "DeviceRecoveryEvents",
                column: "PublicId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeviceRecoveryEvents");

            migrationBuilder.DropIndex(
                name: "IX_LocationHistories_DeviceId_ClientLocalId",
                table: "LocationHistories");

            migrationBuilder.DropColumn(
                name: "ClientLocalId",
                table: "LocationHistories");

            migrationBuilder.CreateIndex(
                name: "IX_LocationHistories_DeviceId",
                table: "LocationHistories",
                column: "DeviceId");
        }
    }
}
