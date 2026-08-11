using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN,MANAGER")]
public class EanManagementController : ControllerBase
{
    private readonly InventoryDbContext _context;

    public EanManagementController(InventoryDbContext context)
    {
        _context = context;
    }

    [HttpGet("session/{inventorySessionId}")]
    public async Task<IActionResult> GetGroupedEans(Guid inventorySessionId, [FromQuery] string? search = null)
    {
        var query = _context.InventoryCounts
            .Where(c => c.InventorySessionId == inventorySessionId && c.DeletedAt == null && c.ProductLocationId != null)
            .Select(c => new
            {
                c.ProductLocationId,
                c.Ean,
                c.Quantity,
                LocationBarcode = c.ProductLocation != null ? c.ProductLocation.Barcode : "SEM LOCAL"
            })
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(c => c.Ean.Contains(normalizedSearch) || c.LocationBarcode.Contains(normalizedSearch));
        }

        var grouped = await query
            .GroupBy(c => new { c.ProductLocationId, c.Ean, c.LocationBarcode })
            .Select(g => new EanLocationGroupDto
            {
                LocationId = g.Key.ProductLocationId!.Value,
                LocationBarcode = g.Key.LocationBarcode,
                Ean = g.Key.Ean,
                TotalQuantity = g.Sum(c => c.Quantity),
                ReadCount = g.Count()
            })
            .OrderBy(g => g.LocationBarcode)
            .ThenBy(g => g.Ean)
            .ToListAsync();

        return Ok(grouped);
    }

    [HttpDelete("session/{inventorySessionId}/location/{locationId}/ean/{ean}")]
    public async Task<IActionResult> DeleteSingleEan(Guid inventorySessionId, Guid locationId, string ean)
    {
        var summary = await _context.InventoryCounts
            .AsNoTracking()
            .Where(c => c.InventorySessionId == inventorySessionId && c.ProductLocationId == locationId && c.Ean == ean && c.DeletedAt == null)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Count = g.Count(),
                Quantity = g.Sum(c => c.Quantity)
            })
            .FirstOrDefaultAsync();

        if (summary == null)
        {
            return NotFound(new { message = "Nenhuma leitura encontrada para este EAN nesta localidade." });
        }

        var now = DateTime.UtcNow;
        await _context.InventoryCounts
            .Where(c => c.InventorySessionId == inventorySessionId && c.ProductLocationId == locationId && c.Ean == ean && c.DeletedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(c => c.DeletedAt, now));

        return Ok(new DeleteResultDto
        {
            DeletedCount = summary.Count,
            DeletedQuantity = summary.Quantity
        });
    }

    [HttpDelete("session/{inventorySessionId}/location/{locationId}")]
    public async Task<IActionResult> DeleteAllEansInLocation(Guid inventorySessionId, Guid locationId)
    {
        var summary = await _context.InventoryCounts
            .AsNoTracking()
            .Where(c => c.InventorySessionId == inventorySessionId && c.ProductLocationId == locationId && c.DeletedAt == null)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Count = g.Count(),
                Quantity = g.Sum(c => c.Quantity)
            })
            .FirstOrDefaultAsync();

        if (summary == null)
        {
            return NotFound(new { message = "Nenhuma leitura encontrada para esta localidade." });
        }

        var now = DateTime.UtcNow;
        await _context.InventoryCounts
            .Where(c => c.InventorySessionId == inventorySessionId && c.ProductLocationId == locationId && c.DeletedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(c => c.DeletedAt, now));

        return Ok(new DeleteResultDto
        {
            DeletedCount = summary.Count,
            DeletedQuantity = summary.Quantity
        });
    }

    public class EanLocationGroupDto
    {
        public Guid LocationId { get; set; }
        public string LocationBarcode { get; set; } = string.Empty;
        public string Ean { get; set; } = string.Empty;
        public int TotalQuantity { get; set; }
        public int ReadCount { get; set; }
    }

    public class DeleteResultDto
    {
        public int DeletedCount { get; set; }
        public int DeletedQuantity { get; set; }
    }
}
