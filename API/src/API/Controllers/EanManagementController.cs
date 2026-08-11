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
        var counts = await _context.InventoryCounts
            .Where(c => c.InventorySessionId == inventorySessionId && c.ProductLocationId == locationId && c.Ean == ean && c.DeletedAt == null)
            .ToListAsync();

        if (counts.Count == 0)
        {
            return NotFound(new { message = "Nenhuma leitura encontrada para este EAN nesta localidade." });
        }

        var now = DateTime.UtcNow;
        foreach (var count in counts)
        {
            count.DeletedAt = now;
        }

        await _context.SaveChangesAsync();

        return Ok(new DeleteResultDto
        {
            DeletedCount = counts.Count,
            DeletedQuantity = counts.Sum(c => c.Quantity)
        });
    }

    [HttpDelete("session/{inventorySessionId}/location/{locationId}")]
    public async Task<IActionResult> DeleteAllEansInLocation(Guid inventorySessionId, Guid locationId)
    {
        var counts = await _context.InventoryCounts
            .Where(c => c.InventorySessionId == inventorySessionId && c.ProductLocationId == locationId && c.DeletedAt == null)
            .ToListAsync();

        if (counts.Count == 0)
        {
            return NotFound(new { message = "Nenhuma leitura encontrada para esta localidade." });
        }

        var now = DateTime.UtcNow;
        foreach (var count in counts)
        {
            count.DeletedAt = now;
        }

        await _context.SaveChangesAsync();

        return Ok(new DeleteResultDto
        {
            DeletedCount = counts.Count,
            DeletedQuantity = counts.Sum(c => c.Quantity)
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
