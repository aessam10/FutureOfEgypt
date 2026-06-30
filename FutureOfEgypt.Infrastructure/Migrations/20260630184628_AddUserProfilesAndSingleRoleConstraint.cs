using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FutureOfEgypt.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserProfilesAndSingleRoleConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_Engineers_EngineerId",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_EngineerId",
                table: "AspNetUsers");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Engineers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserType",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            // 3. Preflight Safety Checks
            migrationBuilder.Sql(@"
DO $$
BEGIN
    -- Check for users with multiple roles
    IF EXISTS (
        SELECT 1 FROM ""AspNetUserRoles""
        GROUP BY ""UserId""
        HAVING COUNT(""RoleId"") > 1
    ) THEN
        RAISE EXCEPTION 'Migration failed: Detected users with multiple roles in AspNetUserRoles. Manual cleanup is required.';
    END IF;

    -- Check for active users with no roles
    IF EXISTS (
        SELECT 1 FROM ""AspNetUsers"" u
        LEFT JOIN ""AspNetUserRoles"" ur ON u.""Id"" = ur.""UserId""
        WHERE ur.""UserId"" IS NULL AND u.""IsDeleted"" = FALSE
    ) THEN
        RAISE EXCEPTION 'Migration failed: Detected active users with no assigned role. Manual cleanup is required.';
    END IF;

    -- Check for Engineer role users without Engineer profile link
    IF EXISTS (
        SELECT 1 FROM ""AspNetUsers"" u
        JOIN ""AspNetUserRoles"" ur ON u.""Id"" = ur.""UserId""
        JOIN ""AspNetRoles"" r ON ur.""RoleId"" = r.""Id""
        WHERE r.""Name"" = 'Engineer' AND u.""EngineerId"" IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration failed: Detected Engineer role users without an Engineer profile link (EngineerId is null).';
    END IF;
END $$;
");

            // 4. Backfill UserType from roles
            migrationBuilder.Sql(@"
UPDATE ""AspNetUsers"" u
SET ""UserType"" = r.""Name""
FROM ""AspNetUserRoles"" ur
JOIN ""AspNetRoles"" r ON ur.""RoleId"" = r.""Id""
WHERE u.""Id"" = ur.""UserId"";
");

            // 5. Validate all active users now have a non-null UserType
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM ""AspNetUsers""
        WHERE ""UserType"" IS NULL AND ""IsDeleted"" = FALSE
    ) THEN
        RAISE EXCEPTION 'Migration failed: Some active users do not have a UserType after backfilling.';
    END IF;
END $$;
");

            // 6. Make UserType NOT NULL
            migrationBuilder.AlterColumn<string>(
                name: "UserType",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "Admins",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PublicId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Admins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Admins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Managers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PublicId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Managers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Managers_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 8. Backfill profiles for existing Admins and Managers
            migrationBuilder.Sql(@"
INSERT INTO ""Admins"" (""PublicId"", ""UserId"", ""FullName"", ""Email"", ""CreatedAt"", ""IsDeleted"")
SELECT gen_random_uuid(), u.""Id"", u.""FullName"", u.""Email"", NOW(), FALSE
FROM ""AspNetUsers"" u
JOIN ""AspNetUserRoles"" ur ON u.""Id"" = ur.""UserId""
JOIN ""AspNetRoles"" r ON ur.""RoleId"" = r.""Id""
WHERE r.""Name"" = 'Admin'
  AND NOT EXISTS (SELECT 1 FROM ""Admins"" a WHERE a.""UserId"" = u.""Id"");

INSERT INTO ""Managers"" (""PublicId"", ""UserId"", ""FullName"", ""Email"", ""CreatedAt"", ""IsDeleted"")
SELECT gen_random_uuid(), u.""Id"", u.""FullName"", u.""Email"", NOW(), FALSE
FROM ""AspNetUsers"" u
JOIN ""AspNetUserRoles"" ur ON u.""Id"" = ur.""UserId""
JOIN ""AspNetRoles"" r ON ur.""RoleId"" = r.""Id""
WHERE r.""Name"" = 'Manager'
  AND NOT EXISTS (SELECT 1 FROM ""Managers"" m WHERE m.""UserId"" = u.""Id"");
");

            // 9. Backfill UserId on Engineers
            migrationBuilder.Sql(@"
UPDATE ""Engineers"" e
SET ""UserId"" = u.""Id""
FROM ""AspNetUsers"" u
WHERE e.""Id"" = u.""EngineerId"" AND e.""UserId"" IS NULL;
");

            migrationBuilder.CreateIndex(
                name: "IX_Engineers_UserId",
                table: "Engineers",
                column: "UserId",
                unique: true,
                filter: "\"UserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_EngineerId",
                table: "AspNetUsers",
                column: "EngineerId",
                unique: true,
                filter: "\"EngineerId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Admins_PublicId",
                table: "Admins",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Admins_UserId",
                table: "Admins",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Managers_PublicId",
                table: "Managers",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Managers_UserId",
                table: "Managers",
                column: "UserId",
                unique: true);

            // 11. Add unique index on AspNetUserRoles.UserId to enforce one role per user
            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_UserId",
                table: "AspNetUserRoles",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Engineers_EngineerId",
                table: "AspNetUsers",
                column: "EngineerId",
                principalTable: "Engineers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Engineers_AspNetUsers_UserId",
                table: "Engineers",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_Engineers_EngineerId",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_Engineers_AspNetUsers_UserId",
                table: "Engineers");

            migrationBuilder.DropTable(
                name: "Admins");

            migrationBuilder.DropTable(
                name: "Managers");

            migrationBuilder.DropIndex(
                name: "IX_Engineers_UserId",
                table: "Engineers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_EngineerId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Engineers");

            migrationBuilder.DropColumn(
                name: "UserType",
                table: "AspNetUsers");

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
    }
}
