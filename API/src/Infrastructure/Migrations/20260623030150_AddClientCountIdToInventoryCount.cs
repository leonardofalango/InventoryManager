using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClientCountIdToInventoryCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClientCountId",
                table: "InventoryCounts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryCounts_ClientCountId",
                table: "InventoryCounts",
                column: "ClientCountId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_InventoryCounts_ClientCountId",
                table: "InventoryCounts");

            migrationBuilder.DropColumn(
                name: "ClientCountId",
                table: "InventoryCounts");
        }
    }
}
