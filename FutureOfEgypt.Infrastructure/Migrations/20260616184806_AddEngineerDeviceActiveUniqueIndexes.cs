using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEngineerDeviceActiveUniqueIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EngineerDevices_DeviceId",
                table: "EngineerDevices");

            migrationBuilder.DropIndex(
                name: "IX_EngineerDevices_EngineerId",
                table: "EngineerDevices");

            migrationBuilder.CreateIndex(
                name: "IX_EngineerDevices_DeviceId",
                table: "EngineerDevices",
                column: "DeviceId",
                unique: true,
                filter: "\"IsActive\" = true AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_EngineerDevices_EngineerId",
                table: "EngineerDevices",
                column: "EngineerId",
                unique: true,
                filter: "\"IsActive\" = true AND \"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EngineerDevices_DeviceId",
                table: "EngineerDevices");

            migrationBuilder.DropIndex(
                name: "IX_EngineerDevices_EngineerId",
                table: "EngineerDevices");

            migrationBuilder.CreateIndex(
                name: "IX_EngineerDevices_DeviceId",
                table: "EngineerDevices",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_EngineerDevices_EngineerId",
                table: "EngineerDevices",
                column: "EngineerId");
        }
    }
}
