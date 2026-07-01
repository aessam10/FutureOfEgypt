using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChatMuteArchiveToParticipants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAtUtc",
                table: "ChatParticipants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "ChatParticipants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "MutedUntilUtc",
                table: "ChatParticipants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatParticipants_UserId_IsArchived",
                table: "ChatParticipants",
                columns: new[] { "UserId", "IsArchived" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ChatParticipants_UserId_IsArchived",
                table: "ChatParticipants");

            migrationBuilder.DropColumn(
                name: "ArchivedAtUtc",
                table: "ChatParticipants");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "ChatParticipants");

            migrationBuilder.DropColumn(
                name: "MutedUntilUtc",
                table: "ChatParticipants");
        }
    }
}
