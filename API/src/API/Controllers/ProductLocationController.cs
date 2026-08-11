using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductLocationController : ControllerBase
{
    private readonly InventoryDbContext _context;

    public ProductLocationController(InventoryDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<ActionResult<IEnumerable<ProductLocation>>> GetProductLocations()
    {
        return await _context.ProductLocations
            .AsNoTracking()
            .ToListAsync();
    }

    [HttpGet("labels/{inventorySessionId}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<ActionResult<IEnumerable<object>>> GetProductLocationsBySession(Guid inventorySessionId)
    {
        try
        {
            var locations = await _context.ProductLocations
                .AsNoTracking()
                .Where(pl => pl.InventorySessionId == inventorySessionId && pl.DeletedAt == null)
                .OrderByDescending(pl => pl.Barcode)
                .Select(pl => new
                {
                    pl.Id,
                    pl.Barcode,
                    pl.InventorySessionId,
                    ReadCount = _context.InventoryCounts.Count(c =>
                        c.InventorySessionId == inventorySessionId &&
                        c.ProductLocationId == pl.Id &&
                        c.DeletedAt == null),
                    TotalQuantity = _context.InventoryCounts
                        .Where(c =>
                            c.InventorySessionId == inventorySessionId &&
                            c.ProductLocationId == pl.Id &&
                            c.DeletedAt == null)
                        .Sum(c => (int?)c.Quantity) ?? 0
                })
                .ToListAsync();

            return Ok(locations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<ActionResult<ProductLocation>> CreateProductLocation(ProductLocation location)
    {
        location.Id = Guid.NewGuid();
        _context.ProductLocations.Add(location);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProductLocations), new { id = location.Id }, location);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> DeleteProductLocation(Guid id)
    {
        var location = await _context.ProductLocations.Where(pl => pl.DeletedAt == null).FirstOrDefaultAsync(pl => pl.Id == id);
        if (location == null) return NotFound();

        var relatedSummary = await _context.InventoryCounts
            .AsNoTracking()
            .Where(c => c.ProductLocationId == id && c.DeletedAt == null)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Count = g.Count(),
                Quantity = g.Sum(c => c.Quantity)
            })
            .FirstOrDefaultAsync();

        var now = DateTime.UtcNow;

        await _context.InventoryCounts
            .Where(c => c.ProductLocationId == id && c.DeletedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(c => c.DeletedAt, now));

        location.DeletedAt = now;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            deletedCounts = relatedSummary?.Count ?? 0,
            deletedQuantity = relatedSummary?.Quantity ?? 0
        });
    }

    [HttpGet("{inventorySessionId}/{barcode}")]
    [Authorize(Roles = "ADMIN,MANAGER,COUNTER")]
    public async Task<ActionResult<ProductLocation>> GetProductLocationByBarcode(Guid inventorySessionId, string barcode)
    {
        var location = await _context.ProductLocations
            .AsNoTracking()
            .Where(pl => pl.DeletedAt == null)
            .FirstOrDefaultAsync(pl => pl.InventorySessionId == inventorySessionId && pl.Barcode == barcode);
        if (location == null)
            return NotFound(new { message = $"Localizacao {barcode} nao encontrada para este inventario." });

        return location;
    }

    [HttpPost("create-locations/{count}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<ActionResult<IEnumerable<ProductLocation>>> CreateLocationsBatch(int count)
    {
        if (count <= 0) return BadRequest("Count must be greater than zero.");
        if (count > 5000) return BadRequest("Crie no maximo 5000 localidades por lote.");

        var lastLocation = await _context.ProductLocations
            .AsNoTracking()
            .Where(pl => pl.Barcode.StartsWith("INV"))
            .OrderByDescending(pl => pl.Barcode)
            .FirstOrDefaultAsync();

        int startNumber = 1;
        if (lastLocation != null && int.TryParse(lastLocation.Barcode.Replace("INV", ""), out int lastNum))
        {
            startNumber = lastNum + 1;
        }

        var newLocations = new List<ProductLocation>();
        for (int i = 0; i < count; i++)
        {
            newLocations.Add(new ProductLocation
            {
                Id = Guid.NewGuid(),
                Barcode = $"INV{(startNumber + i):D4}"
            });
        }

        _context.ProductLocations.AddRange(newLocations);
        await _context.SaveChangesAsync();

        return Ok(newLocations);
    }

    [HttpPost("set-locations/{inventorySessionId}/{start}/{end}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> SetLocationsToSession(Guid inventorySessionId, int start, int end)
    {
        if (start > end) return BadRequest("Start number cannot be greater than end number.");

        var session = await _context.InventorySessions.FindAsync(inventorySessionId);
        if (session == null) return NotFound("Inventory session not found.");

        string startBarcode = $"INV{start:D4}";
        string endBarcode = $"INV{end:D4}";

        var locationsToUpdateQuery = _context.ProductLocations
            .Where(pl => string.Compare(pl.Barcode, startBarcode) >= 0 &&
                         string.Compare(pl.Barcode, endBarcode) <= 0 &&
                         pl.DeletedAt == null);

        var updatedCount = await locationsToUpdateQuery
            .ExecuteUpdateAsync(setters => setters.SetProperty(pl => pl.InventorySessionId, inventorySessionId));

        if (updatedCount == 0) return NotFound("No locations found in the specified range.");

        return Ok(new { Message = $"{updatedCount} locations updated successfully." });
    }

    [HttpPost("create-and-set-locations/{inventorySessionId}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> CreateAndSetLocationsBatch(Guid inventorySessionId, [FromBody] CreateAndSetLocationRequest request)
    {
        if (request.startCount > request.endCount) return BadRequest("Start count cannot be greater than end count.");
        if (request.endCount - request.startCount + 1 > 5000) return BadRequest("Crie no maximo 5000 etiquetas por lote.");

        var session = await _context.InventorySessions.FindAsync(inventorySessionId);
        if (session == null) return NotFound("Inventory session not found.");

        var newLocations = new List<ProductLocation>();
        for (int i = request.startCount; i <= request.endCount; i++)
        {
            newLocations.Add(new ProductLocation
            {
                Id = Guid.NewGuid(),
                Barcode = $"INV{i:D4}",
                InventorySessionId = inventorySessionId
            });
        }

        _context.ProductLocations.AddRange(newLocations);
        await _context.SaveChangesAsync();

        return Ok(new { Message = $"{newLocations.Count} locations created and assigned to session successfully.", Locations = newLocations });
    }

    public class CreateAndSetLocationRequest
    {
        public int startCount { get; set; }
        public int endCount { get; set; }
    }
}
