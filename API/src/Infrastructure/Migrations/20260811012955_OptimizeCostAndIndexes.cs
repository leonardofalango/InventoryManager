using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeCostAndIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExpectedStocks_InventorySessions_InventorySessionId1",
                table: "ExpectedStocks");

            migrationBuilder.DropIndex(
                name: "IX_Products_Ean_InventorySessionId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_ProductLocations_InventorySessionId_Barcode",
                table: "ProductLocations");

            migrationBuilder.DropIndex(
                name: "IX_InventorySessions_TeamId",
                table: "InventorySessions");

            migrationBuilder.DropIndex(
                name: "IX_InventoryCounts_ClientCountId",
                table: "InventoryCounts");

            migrationBuilder.DropIndex(
                name: "IX_ExpectedStocks_InventorySessionId",
                table: "ExpectedStocks");

            migrationBuilder.DropIndex(
                name: "IX_ExpectedStocks_InventorySessionId1",
                table: "ExpectedStocks");

            migrationBuilder.DropColumn(
                name: "InventorySessionId1",
                table: "ExpectedStocks");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Products_Ean_InventorySessionId",
                table: "Products",
                columns: new[] { "Ean", "InventorySessionId" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductLocations_InventorySessionId_Barcode",
                table: "ProductLocations",
                columns: new[] { "InventorySessionId", "Barcode" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_InventorySessions_StartDate",
                table: "InventorySessions",
                column: "StartDate");

            migrationBuilder.CreateIndex(
                name: "IX_InventorySessions_TeamId_Status_StartDate",
                table: "InventorySessions",
                columns: new[] { "TeamId", "Status", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryCounts_ClientCountId",
                table: "InventoryCounts",
                column: "ClientCountId",
                unique: true,
                filter: "\"ClientCountId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryCounts_InventorySessionId_CountedAt",
                table: "InventoryCounts",
                columns: new[] { "InventorySessionId", "CountedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryCounts_InventorySessionId_Ean",
                table: "InventoryCounts",
                columns: new[] { "InventorySessionId", "Ean" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryCounts_InventorySessionId_ProductLocationId",
                table: "InventoryCounts",
                columns: new[] { "InventorySessionId", "ProductLocationId" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryCounts_InventorySessionId_ProductLocationId_Ean",
                table: "InventoryCounts",
                columns: new[] { "InventorySessionId", "ProductLocationId", "Ean" });

            migrationBuilder.CreateIndex(
                name: "IX_ExpectedStocks_InventorySessionId_ProductId",
                table: "ExpectedStocks",
                columns: new[] { "InventorySessionId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Datetime",
                table: "AuditLogs",
                column: "Datetime");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Products_Ean_InventorySessionId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_ProductLocations_InventorySessionId_Barcode",
                table: "ProductLocations");

            migrationBuilder.DropIndex(
                name: "IX_InventorySessions_StartDate",
                table: "InventorySessions");

            migrationBuilder.DropIndex(
                name: "IX_InventorySessions_TeamId_Status_StartDate",
                table: "InventorySessions");

            migrationBuilder.DropIndex(
                name: "IX_InventoryCounts_ClientCountId",
                table: "InventoryCounts");

            migrationBuilder.DropIndex(
                name: "IX_InventoryCounts_InventorySessionId_CountedAt",
                table: "InventoryCounts");

            migrationBuilder.DropIndex(
                name: "IX_InventoryCounts_InventorySessionId_Ean",
                table: "InventoryCounts");

            migrationBuilder.DropIndex(
                name: "IX_InventoryCounts_InventorySessionId_ProductLocationId",
                table: "InventoryCounts");

            migrationBuilder.DropIndex(
                name: "IX_InventoryCounts_InventorySessionId_ProductLocationId_Ean",
                table: "InventoryCounts");

            migrationBuilder.DropIndex(
                name: "IX_ExpectedStocks_InventorySessionId_ProductId",
                table: "ExpectedStocks");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_Datetime",
                table: "AuditLogs");

            migrationBuilder.AddColumn<Guid>(
                name: "InventorySessionId1",
                table: "ExpectedStocks",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_Ean_InventorySessionId",
                table: "Products",
                columns: new[] { "Ean", "InventorySessionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductLocations_InventorySessionId_Barcode",
                table: "ProductLocations",
                columns: new[] { "InventorySessionId", "Barcode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventorySessions_TeamId",
                table: "InventorySessions",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryCounts_ClientCountId",
                table: "InventoryCounts",
                column: "ClientCountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExpectedStocks_InventorySessionId",
                table: "ExpectedStocks",
                column: "InventorySessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpectedStocks_InventorySessionId1",
                table: "ExpectedStocks",
                column: "InventorySessionId1");

            migrationBuilder.AddForeignKey(
                name: "FK_ExpectedStocks_InventorySessions_InventorySessionId1",
                table: "ExpectedStocks",
                column: "InventorySessionId1",
                principalTable: "InventorySessions",
                principalColumn: "Id");
        }
    }
}
