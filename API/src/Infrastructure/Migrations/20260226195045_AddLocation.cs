using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryCounts_ProductLocation_ProductLocationId",
                table: "InventoryCounts");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductLocation_Customers_CustomerId",
                table: "ProductLocation");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ProductLocation",
                table: "ProductLocation");

            migrationBuilder.RenameTable(
                name: "ProductLocation",
                newName: "ProductLocations");

            migrationBuilder.RenameIndex(
                name: "IX_ProductLocation_CustomerId",
                table: "ProductLocations",
                newName: "IX_ProductLocations_CustomerId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ProductLocations",
                table: "ProductLocations",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_ProductLocations_Barcode",
                table: "ProductLocations",
                column: "Barcode",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryCounts_ProductLocations_ProductLocationId",
                table: "InventoryCounts",
                column: "ProductLocationId",
                principalTable: "ProductLocations",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductLocations_Customers_CustomerId",
                table: "ProductLocations",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryCounts_ProductLocations_ProductLocationId",
                table: "InventoryCounts");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductLocations_Customers_CustomerId",
                table: "ProductLocations");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ProductLocations",
                table: "ProductLocations");

            migrationBuilder.DropIndex(
                name: "IX_ProductLocations_Barcode",
                table: "ProductLocations");

            migrationBuilder.RenameTable(
                name: "ProductLocations",
                newName: "ProductLocation");

            migrationBuilder.RenameIndex(
                name: "IX_ProductLocations_CustomerId",
                table: "ProductLocation",
                newName: "IX_ProductLocation_CustomerId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ProductLocation",
                table: "ProductLocation",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryCounts_ProductLocation_ProductLocationId",
                table: "InventoryCounts",
                column: "ProductLocationId",
                principalTable: "ProductLocation",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductLocation_Customers_CustomerId",
                table: "ProductLocation",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id");
        }
    }
}
