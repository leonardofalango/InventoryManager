using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInventorySessionInPL : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProductLocations_Barcode",
                table: "ProductLocations");

            migrationBuilder.DropIndex(
                name: "IX_ProductLocations_InventorySessionId",
                table: "ProductLocations");

            migrationBuilder.CreateIndex(
                name: "IX_ProductLocations_InventorySessionId_Barcode",
                table: "ProductLocations",
                columns: new[] { "InventorySessionId", "Barcode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProductLocations_InventorySessionId_Barcode",
                table: "ProductLocations");

            migrationBuilder.CreateIndex(
                name: "IX_ProductLocations_Barcode",
                table: "ProductLocations",
                column: "Barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductLocations_InventorySessionId",
                table: "ProductLocations",
                column: "InventorySessionId");
        }
    }
}
