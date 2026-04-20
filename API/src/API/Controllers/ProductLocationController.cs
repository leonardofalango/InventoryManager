using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductLocationController : ControllerBase
{
    private readonly InventoryDbContext _context;

    public ProductLocationController(InventoryDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductLocation>>> GetProductLocations()
    {
        return await _context.ProductLocations.ToListAsync();
    }

    [HttpGet("labels/{inventorySessionId}")]
    public async Task<ActionResult<IEnumerable<ProductLocation>>> GetProductLocationsBySession(Guid inventorySessionId)
    {
        try
        {
            var locations = await _context.ProductLocations
            .Include(pl => pl.InventorySession)
            .Where(
                pl => pl.InventorySessionId == inventorySessionId
            ).ToListAsync();
            return Ok(locations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpPost]
    public async Task<ActionResult<ProductLocation>> CreateProductLocation(ProductLocation location)
    {
        location.Id = Guid.NewGuid();
        _context.ProductLocations.Add(location);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProductLocations), new { id = location.Id }, location);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProductLocation(Guid id)
    {
        var location = await _context.ProductLocations.FindAsync(id);
        if (location == null) return NotFound();

        _context.ProductLocations.Remove(location);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{inventorySessionId}/{barcode}")]
    public async Task<ActionResult<ProductLocation>> GetProductLocationByBarcode(Guid inventorySessionId, string barcode)
    {
        var location = await _context.ProductLocations.Where(pl => pl.InventorySessionId == inventorySessionId && pl.Barcode == barcode).FirstOrDefaultAsync();
        if (location == null) return NotFound();
        return location;
    }

    [HttpPost("create-locations/{count}")]
    public async Task<ActionResult<IEnumerable<ProductLocation>>> CreateLocationsBatch(int count)
    {
        if (count <= 0) return BadRequest("Count must be greater than zero.");

        var lastLocation = await _context.ProductLocations
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
    public async Task<IActionResult> SetLocationsToSession(Guid inventorySessionId, int start, int end)
    {
        if (start > end) return BadRequest("Start number cannot be greater than end number.");

        var session = await _context.InventorySessions.FindAsync(inventorySessionId);
        if (session == null) return NotFound("Inventory session not found.");

        string startBarcode = $"INV{start:D4}";
        string endBarcode = $"INV{end:D4}";

        var locationsToUpdate = await _context.ProductLocations
            .Where(pl => string.Compare(pl.Barcode, startBarcode) >= 0 &&
                         string.Compare(pl.Barcode, endBarcode) <= 0)
            .ToListAsync();

        if (!locationsToUpdate.Any()) return NotFound("No locations found in the specified range.");

        foreach (var location in locationsToUpdate)
        {
            location.InventorySessionId = inventorySessionId;
        }

        await _context.SaveChangesAsync();

        return Ok(new { Message = $"{locationsToUpdate.Count} locations updated successfully.", Locations = locationsToUpdate });
    }

    [HttpPost("create-and-set-locations/{inventorySessionId}")]
    public async Task<IActionResult> CreateAndSetLocationsBatch(Guid inventorySessionId, [FromBody] CreateAndSetLocationRequest request)
    {
        if (request.startCount > request.endCount) return BadRequest("Start count cannot be greater than end count.");

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