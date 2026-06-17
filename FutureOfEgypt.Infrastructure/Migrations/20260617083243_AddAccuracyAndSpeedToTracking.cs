using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAccuracyAndSpeedToTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Accuracy",
                table: "LocationHistories",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Speed",
                table: "LocationHistories",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Accuracy",
                table: "DeviceLatestLocations",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Speed",
                table: "DeviceLatestLocations",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Accuracy",
                table: "LocationHistories");

            migrationBuilder.DropColumn(
                name: "Speed",
                table: "LocationHistories");

            migrationBuilder.DropColumn(
                name: "Accuracy",
                table: "DeviceLatestLocations");

            migrationBuilder.DropColumn(
                name: "Speed",
                table: "DeviceLatestLocations");
        }
    }
}
