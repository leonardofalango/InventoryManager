using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamToInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TeamId",
                table: "InventorySessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventorySessions_TeamId",
                table: "InventorySessions",
                column: "TeamId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventorySessions_Teams_TeamId",
                table: "InventorySessions",
                column: "TeamId",
                principalTable: "Teams",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventorySessions_Teams_TeamId",
                table: "InventorySessions");

            migrationBuilder.DropIndex(
                name: "IX_InventorySessions_TeamId",
                table: "InventorySessions");

            migrationBuilder.DropColumn(
                name: "TeamId",
                table: "InventorySessions");
        }
    }
}
