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

    [HttpPost]
    public async Task<ActionResult<ProductLocation>> CreateProductLocation(ProductLocation location)
    {
        location.Id = Guid.NewGuid(); // Gera um novo ID
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
}