using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceLocationHiddenFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "HiddenAt",
                table: "DeviceLatestLocations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "HiddenByUserId",
                table: "DeviceLatestLocations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HiddenReason",
                table: "DeviceLatestLocations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "DeviceLatestLocations",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HiddenAt",
                table: "DeviceLatestLocations");

            migrationBuilder.DropColumn(
                name: "HiddenByUserId",
                table: "DeviceLatestLocations");

            migrationBuilder.DropColumn(
                name: "HiddenReason",
                table: "DeviceLatestLocations");

            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "DeviceLatestLocations");
        }
    }
}
