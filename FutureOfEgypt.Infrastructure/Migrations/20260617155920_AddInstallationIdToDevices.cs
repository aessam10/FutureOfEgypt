using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInstallationIdToDevices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DeviceAccessRequests_EngineerId_SerialNumber_Status",
                table: "DeviceAccessRequests");

            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "Devices",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Imei",
                table: "Devices",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DeviceName",
                table: "Devices",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "InstallationId",
                table: "Devices",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InstallationId",
                table: "DeviceAccessRequests",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Devices_Imei",
                table: "Devices",
                column: "Imei");

            migrationBuilder.CreateIndex(
                name: "IX_Devices_InstallationId",
                table: "Devices",
                column: "InstallationId",
                unique: true,
                filter: "\"InstallationId\" IS NOT NULL AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Devices_SerialNumber",
                table: "Devices",
                column: "SerialNumber");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAccessRequests_EngineerId_InstallationId_Status",
                table: "DeviceAccessRequests",
                columns: new[] { "EngineerId", "InstallationId", "Status" },
                unique: true,
                filter: "\"InstallationId\" IS NOT NULL AND \"Status\" = 1 AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAccessRequests_InstallationId",
                table: "DeviceAccessRequests",
                column: "InstallationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Devices_Imei",
                table: "Devices");

            migrationBuilder.DropIndex(
                name: "IX_Devices_InstallationId",
                table: "Devices");

            migrationBuilder.DropIndex(
                name: "IX_Devices_SerialNumber",
                table: "Devices");

            migrationBuilder.DropIndex(
                name: "IX_DeviceAccessRequests_EngineerId_InstallationId_Status",
                table: "DeviceAccessRequests");

            migrationBuilder.DropIndex(
                name: "IX_DeviceAccessRequests_InstallationId",
                table: "DeviceAccessRequests");

            migrationBuilder.DropColumn(
                name: "InstallationId",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "InstallationId",
                table: "DeviceAccessRequests");

            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "Devices",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Imei",
                table: "Devices",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DeviceName",
                table: "Devices",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.CreateIndex(
                name: "IX_DeviceAccessRequests_EngineerId_SerialNumber_Status",
                table: "DeviceAccessRequests",
                columns: new[] { "EngineerId", "SerialNumber", "Status" },
                unique: true,
                filter: "\"Status\" = 1 AND \"IsDeleted\" = false");
        }
    }
}
