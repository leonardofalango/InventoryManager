using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN,MANAGER")]
public class ProductsController : ControllerBase
{
    private readonly InventoryDbContext _context;

    public ProductsController(InventoryDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult> GetProducts(
        [FromQuery] Guid inventorySessionId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null)
    {
        var query = _context.Products
            .Where(p => p.InventorySessionId == inventorySessionId && p.DeletedAt == null)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = $"%{search.Trim()}%";
            query = query.Where(p => EF.Functions.ILike(p.Name, searchTerm) || p.Ean.Contains(search.Trim()));
        }

        var totalItems = await query.CountAsync();

        var products = await query
            .Where(p => p.DeletedAt == null)
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.Ean,
                p.Name,
                p.Category,
                p.Price,
                p.InventorySessionId
            })
            .ToListAsync();

        return Ok(new
        {
            data = products,
            totalItems,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
        });
    }

    [HttpPost("{inventorySessionId:guid}")]
    public async Task<ActionResult<Product>> CreateProduct(Guid inventorySessionId, [FromBody] ProductUpsertRequest request)
    {
        var product = new Product
        {
            InventorySessionId = inventorySessionId,
            Ean = request.Ean.Trim(),
            Name = request.Name.Trim(),
            Category = request.Category?.Trim() ?? string.Empty,
            Price = request.Price ?? 0
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetProducts), new { inventorySessionId = product.InventorySessionId }, product);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] ProductUpsertRequest request)
    {
        var product = await _context.Products
            .Where(p => p.DeletedAt == null)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null) return NotFound();

        product.Ean = request.Ean.Trim();
        product.Name = request.Name.Trim();
        product.Category = request.Category?.Trim() ?? product.Category;
        product.Price = request.Price ?? product.Price;
        product.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.Products.Any(e => e.Id == id)) return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        var product = await _context.Products.Where(p => p.DeletedAt == null).FirstOrDefaultAsync(p => p.Id == id);
        if (product == null) return NotFound();

        product.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("session/{inventorySessionId:guid}")]
    public async Task<IActionResult> DeleteAllProductsBySession(Guid inventorySessionId)
    {
        var now = DateTime.UtcNow;
        var updated = await _context.Products
            .Where(p => p.InventorySessionId == inventorySessionId && p.DeletedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.DeletedAt, now));

        if (updated == 0) return NoContent();

        return NoContent();
    }

    public class ProductUpsertRequest
    {
        public string Ean { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public decimal? Price { get; set; }
    }
}
