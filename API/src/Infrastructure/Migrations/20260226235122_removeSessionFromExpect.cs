using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class removeSessionFromExpect : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExpectedStocks_InventorySessions_InventorySessionId",
                table: "ExpectedStocks");

            migrationBuilder.DropIndex(
                name: "IX_ExpectedStocks_InventorySessionId",
                table: "ExpectedStocks");

            migrationBuilder.AlterColumn<string>(
                name: "Barcode",
                table: "ProductLocations",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Barcode",
                table: "ProductLocations",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "IX_ExpectedStocks_InventorySessionId",
                table: "ExpectedStocks",
                column: "InventorySessionId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExpectedStocks_InventorySessions_InventorySessionId",
                table: "ExpectedStocks",
                column: "InventorySessionId",
                principalTable: "InventorySessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
