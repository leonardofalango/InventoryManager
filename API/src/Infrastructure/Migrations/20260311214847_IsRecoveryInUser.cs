using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class IsRecoveryInUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "isRecovery",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "isRecovery",
                table: "Users");
        }
    }
}
