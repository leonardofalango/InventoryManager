using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN,MANAGER")]
public class StockController : ControllerBase
{
    private readonly InventoryDbContext _context;
    public StockController(InventoryDbContext context) => _context = context;

    [HttpGet("{sessionId}")]
    public async Task<IActionResult> GetExpectedStock(
        Guid sessionId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var query = _context.ExpectedStocks
            .Include(e => e.Product)
            .Where(e => e.InventorySessionId == sessionId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(e =>
                e.Product.Ean.Contains(searchLower) ||
                (e.Product != null && e.Product.Name.ToLower().Contains(searchLower)));
        }

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderBy(e => e.Product.Ean)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new
            {
                e.Id,
                e.Product.Ean,
                ProductName = e.Product.Name,
                e.ExpectedQuantity
            })
            .ToListAsync();

        return Ok(new
        {
            data = items,
            totalItems,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
        });
    }

    [HttpPost("{sessionId}")]
    public async Task<IActionResult> AddExpectedStock(Guid sessionId, [FromBody] ExpectedStockCreate request)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Ean == request.Ean);
        if (product == null) return NotFound(new { message = "Produto não encontrado." });

        var stock = new ExpectedStock
        {
            InventorySessionId = sessionId,
            ProductId = product.Id,
            ExpectedQuantity = request.ExpectedQuantity,
            Product = product
        };

        _context.ExpectedStocks.Add(stock);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Estoque adicionado com sucesso." });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateExpectedStock(Guid id, [FromBody] ExpectedStockUpdate request)
    {
        var stock = await _context.ExpectedStocks
            .Include(e => e.Product)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (stock == null) return NotFound(new { message = "Item não encontrado." });

        if (!string.IsNullOrWhiteSpace(request.newEan))
        {
            var existingStock = await _context.ExpectedStocks.
                Include(e => e.Product)
                .FirstOrDefaultAsync(e => e.Product.Ean == request.newEan && e.Id != id);

            if (existingStock != null)
                return BadRequest(new { message = "Já existe um item com esse EAN." });

            var newProduct = await _context.Products.FirstOrDefaultAsync(p => p.Ean == request.newEan);
            if (newProduct == null) return NotFound(new { message = "Produto não encontrado." });
            stock.ProductId = newProduct.Id;
            stock.Product = newProduct;
        }

        if (request.ExpectedQuantity.HasValue)
            stock.ExpectedQuantity = request.ExpectedQuantity.Value;

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Item {stock.Product.Ean} atualizado com sucesso." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpectedStock(Guid id)
    {
        var stock = await _context.ExpectedStocks.FindAsync(id);
        if (stock == null) return NotFound(new { message = "Item não encontrado." });

        _context.ExpectedStocks.Remove(stock);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Item removido." });
    }
}

public class ExpectedStockCreate
{
    public required string Ean { get; set; }
    public int ExpectedQuantity { get; set; }
}

public class ExpectedStockUpdate
{
    public string? newEan { get; set; }
    public int? ExpectedQuantity { get; set; }
}