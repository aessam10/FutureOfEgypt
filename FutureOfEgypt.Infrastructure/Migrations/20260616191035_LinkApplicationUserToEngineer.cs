using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class LinkApplicationUserToEngineer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EngineerId",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_EngineerId",
                table: "AspNetUsers",
                column: "EngineerId");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Engineers_EngineerId",
                table: "AspNetUsers",
                column: "EngineerId",
                principalTable: "Engineers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_Engineers_EngineerId",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_EngineerId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "EngineerId",
                table: "AspNetUsers");
        }
    }
}
