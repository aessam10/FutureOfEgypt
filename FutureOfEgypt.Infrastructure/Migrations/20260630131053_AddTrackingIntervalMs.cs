using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTrackingIntervalMs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "BatteryOptimizationIgnored",
                table: "DeviceTrackingHealthStatuses",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<int>(
                name: "TrackingIntervalMs",
                table: "DeviceTrackingHealthStatuses",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TrackingIntervalMs",
                table: "DeviceTrackingHealthStatuses");

            migrationBuilder.AlterColumn<bool>(
                name: "BatteryOptimizationIgnored",
                table: "DeviceTrackingHealthStatuses",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);
        }
    }
}
