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
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(searchLower) || p.Ean.Contains(searchLower));
        }

        var totalItems = await query.CountAsync();

        var products = await query
            .Where(p => p.DeletedAt == null)
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
    public async Task<ActionResult<Product>> CreateProduct(
        Guid inventorySessionId,
        [FromBody] SaveProductRequest request)
    {
        var sessionExists = await _context.InventorySessions.AnyAsync(s => s.Id == inventorySessionId);
        if (!sessionExists)
        {
            return NotFound(new { message = "Sessão de inventário não encontrada." });
        }

        var ean = request.Ean.Trim();
        var name = request.Name.Trim();

        if (string.IsNullOrWhiteSpace(ean) || string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new { message = "EAN e nome são obrigatórios." });
        }

        var productAlreadyExists = await _context.Products
            .AnyAsync(p => p.InventorySessionId == inventorySessionId && p.Ean == ean);

        if (productAlreadyExists)
        {
            return Conflict(new { message = "Já existe um produto com este EAN nesta sessão." });
        }

        var product = new Product
        {
            Ean = ean,
            Name = name,
            InventorySessionId = inventorySessionId
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetProducts), new { inventorySessionId = product.InventorySessionId }, product);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] SaveProductRequest request)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product == null)
        {
            return NotFound(new { message = "Produto não encontrado." });
        }

        var ean = request.Ean.Trim();
        var name = request.Name.Trim();

        if (string.IsNullOrWhiteSpace(ean) || string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new { message = "EAN e nome são obrigatórios." });
        }

        var productAlreadyExists = await _context.Products.AnyAsync(p =>
            p.Id != id &&
            p.InventorySessionId == product.InventorySessionId &&
            p.Ean == ean);

        if (productAlreadyExists)
        {
            return Conflict(new { message = "Já existe um produto com este EAN nesta sessão." });
        }

        product.Ean = ean;
        product.Name = name;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
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
        var products = await _context.Products
            .Where(p => p.InventorySessionId == inventorySessionId && p.DeletedAt == null)
            .ToListAsync();

        if (!products.Any()) return NoContent();

        var now = DateTime.UtcNow;

        foreach (var product in products)
        {
            product.DeletedAt = now;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class SaveProductRequest
{
    public string Ean { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
