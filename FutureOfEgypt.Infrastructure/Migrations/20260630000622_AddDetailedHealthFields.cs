using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDetailedHealthFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "BackgroundServiceAlive",
                table: "DeviceTrackingHealthStatuses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LastError",
                table: "DeviceTrackingHealthStatuses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastTickAtUtc",
                table: "DeviceTrackingHealthStatuses",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackgroundServiceAlive",
                table: "DeviceTrackingHealthStatuses");

            migrationBuilder.DropColumn(
                name: "LastError",
                table: "DeviceTrackingHealthStatuses");

            migrationBuilder.DropColumn(
                name: "LastTickAtUtc",
                table: "DeviceTrackingHealthStatuses");
        }
    }
}
