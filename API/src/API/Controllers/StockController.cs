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

    [HttpGet("{sessionId:guid}")]
    public async Task<IActionResult> GetExpectedStock(
        Guid sessionId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var query = _context.ExpectedStocks
            .Include(e => e.Product)
            .Where(e => e.InventorySessionId == sessionId && e.DeletedAt == null)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(
                e =>
                e.Product.Ean.Contains(searchLower) ||
                e.Product != null && e.Product.Name.ToLower().Contains(searchLower)
                && e.DeletedAt == null
            );
        }

        var totalItems = await query.CountAsync();

        var items = await query
            .Where(e => e.DeletedAt == null)
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

    [HttpPost("{sessionId:guid}")]
    public async Task<IActionResult> AddExpectedStock(Guid sessionId, [FromBody] ExpectedStockCreate request)
    {
        var product = await _context.Products
            .Where(p => p.DeletedAt == null && p.Ean == request.Ean && p.InventorySessionId == sessionId)
            .FirstOrDefaultAsync(p => p.Ean == request.Ean);

        if (product == null) return NotFound(new { message = "Produto não encontrado." });

        var existingStock = await _context.ExpectedStocks
            .FirstOrDefaultAsync(
                e =>
                e.InventorySessionId == sessionId &&
                e.ProductId == product.Id &&
                e.DeletedAt == null
            );

        if (existingStock != null)
        {
            return BadRequest(new { message = "Este produto já está na lista de estoque esperado. Use o botão de editar para alterar a quantidade." });
        }

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

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateExpectedStock(Guid id, [FromBody] ExpectedStockUpdate request)
    {
        var stock = await _context.ExpectedStocks
            .Include(e => e.Product)
            .Where(e => e.DeletedAt == null)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (stock == null) return NotFound(new { message = "Item não encontrado." });

        if (!string.IsNullOrWhiteSpace(request.newEan))
        {
            var existingStock = await _context.ExpectedStocks.
                Include(e => e.Product)
                .FirstOrDefaultAsync(e => e.Product.Ean == request.newEan && e.Id != id && e.DeletedAt == null);

            if (existingStock != null)
                return BadRequest(new { message = "Já existe um item com esse EAN." });

            var newProduct = await _context.Products.FirstOrDefaultAsync(p => p.Ean == request.newEan && p.DeletedAt == null);
            if (newProduct == null) return NotFound(new { message = "Produto não encontrado." });
            stock.ProductId = newProduct.Id;
            stock.Product = newProduct;
        }

        if (request.ExpectedQuantity.HasValue)
            stock.ExpectedQuantity = request.ExpectedQuantity.Value;

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Item {stock.Product.Ean} atualizado com sucesso." });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteExpectedStock(Guid id)
    {
        var stock = await _context.ExpectedStocks.Where(e => e.DeletedAt == null).FirstOrDefaultAsync(e => e.Id == id);
        if (stock == null) return NotFound(new { message = "Item não encontrado." });

        stock.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Item removido." });
    }

    [HttpPost("preview")]
    public async Task<IActionResult> PreviewExpectedStock([FromBody] PreviewStockRequest request)
    {
        if (request.Items == null || !request.Items.Any())
            return BadRequest(new { message = "Nenhum item fornecido para validação." });

        var groupedItems = request.Items
            .GroupBy(i => i.Ean)
            .Select(g => new PreviewStockRequestItem
            {
                Ean = g.Key,
                ExpectedQuantity = g.Sum(i => i.ExpectedQuantity)
            })
            .ToList();

        var eans = groupedItems.Select(i => i.Ean).ToList();

        var products = await _context.Products
            .Where(p => eans.Contains(p.Ean) && p.DeletedAt == null)
            .Select(p => new { p.Ean, p.Name, p.Price })
            .ToListAsync();

        var productDict = products
            .DistinctBy(p => p.Ean)
            .ToDictionary(p => p.Ean, p => p);

        var enrichedItems = groupedItems.Select(item =>
        {
            var found = productDict.TryGetValue(item.Ean, out var product);
            return new PreviewStockResponseItem
            {
                Ean = item.Ean,
                ExpectedQuantity = item.ExpectedQuantity,
                ProductName = found ? product!.Name : "Produto não encontrado",
                Price = found ? product?.Price : null
            };
        }).ToList();

        return Ok(enrichedItems);
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


public class PreviewStockRequest
{
    public List<PreviewStockRequestItem> Items { get; set; } = new();
}

public class PreviewStockRequestItem
{
    public required string Ean { get; set; }
    public int ExpectedQuantity { get; set; }
}

public class PreviewStockResponseItem
{
    public required string Ean { get; set; }
    public int ExpectedQuantity { get; set; }
    public required string ProductName { get; set; }
    public decimal? Price { get; set; }
}