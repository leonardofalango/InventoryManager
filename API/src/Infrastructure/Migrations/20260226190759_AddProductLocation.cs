using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProductLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShelfId",
                table: "InventoryCounts");

            migrationBuilder.AddColumn<Guid>(
                name: "ProductLocationId",
                table: "InventoryCounts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductLocation",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Barcode = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductLocation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductLocation_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryCounts_ProductLocationId",
                table: "InventoryCounts",
                column: "ProductLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductLocation_CustomerId",
                table: "ProductLocation",
                column: "CustomerId");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryCounts_ProductLocation_ProductLocationId",
                table: "InventoryCounts",
                column: "ProductLocationId",
                principalTable: "ProductLocation",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryCounts_ProductLocation_ProductLocationId",
                table: "InventoryCounts");

            migrationBuilder.DropTable(
                name: "ProductLocation");

            migrationBuilder.DropIndex(
                name: "IX_InventoryCounts_ProductLocationId",
                table: "InventoryCounts");

            migrationBuilder.DropColumn(
                name: "ProductLocationId",
                table: "InventoryCounts");

            migrationBuilder.AddColumn<string>(
                name: "ShelfId",
                table: "InventoryCounts",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
