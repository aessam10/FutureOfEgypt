using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceAccessRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeviceAccessRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EngineerId = table.Column<int>(type: "integer", nullable: false),
                    DeviceName = table.Column<string>(type: "text", nullable: false),
                    SerialNumber = table.Column<string>(type: "text", nullable: false),
                    Imei = table.Column<string>(type: "text", nullable: true),
                    Platform = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RequestedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewNote = table.Column<string>(type: "text", nullable: true),
                    CreatedDeviceId = table.Column<int>(type: "integer", nullable: true),
                    PublicId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceAccessRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceAccessRequests_Devices_CreatedDeviceId",
                        column: x => x.CreatedDeviceId,
                        principalTable: "Devices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DeviceAccessRequests_Engineers_EngineerId",
                        column: x => x.EngineerId,
                        principalTable: "Engineers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAccessRequests_CreatedDeviceId",
                table: "DeviceAccessRequests",
                column: "CreatedDeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAccessRequests_EngineerId",
                table: "DeviceAccessRequests",
                column: "EngineerId");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAccessRequests_EngineerId_SerialNumber_Status",
                table: "DeviceAccessRequests",
                columns: new[] { "EngineerId", "SerialNumber", "Status" },
                unique: true,
                filter: "\"Status\" = 1 AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAccessRequests_PublicId",
                table: "DeviceAccessRequests",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAccessRequests_SerialNumber",
                table: "DeviceAccessRequests",
                column: "SerialNumber");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAccessRequests_Status",
                table: "DeviceAccessRequests",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeviceAccessRequests");
        }
    }
}
