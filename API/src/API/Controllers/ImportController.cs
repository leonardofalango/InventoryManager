using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN,MANAGER")]
public class ImportController : ControllerBase
{
    private readonly InventoryDbContext _context;
    public ImportController(InventoryDbContext context) => _context = context;

    [HttpPost("products/{sessionId}")]
    public async Task<IActionResult> ImportProducts(Guid sessionId, [FromBody] List<Product> products)
    {
        var sessionExists = await _context.InventorySessions.AnyAsync(s => s.Id == sessionId);
        if (!sessionExists) return NotFound("Sessão não encontrada.");

        var incomingProducts = products
            .Where(product => !string.IsNullOrWhiteSpace(product.Ean))
            .GroupBy(product => product.Ean.Trim())
            .Select(group =>
            {
                var product = group.Last();
                product.Ean = group.Key;
                product.Name = product.Name.Trim();
                product.Category = product.Category?.Trim() ?? string.Empty;
                return product;
            })
            .ToList();

        var eans = incomingProducts.Select(product => product.Ean).ToList();
        var existingByEan = await _context.Products
            .IgnoreQueryFilters()
            .Where(product => product.InventorySessionId == sessionId && eans.Contains(product.Ean))
            .ToDictionaryAsync(product => product.Ean);

        foreach (var product in incomingProducts)
        {
            if (existingByEan.TryGetValue(product.Ean, out var existing))
            {
                existing.Name = product.Name;
                existing.Category = product.Category;
                existing.Price = product.Price;
                existing.DeletedAt = null;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.Products.Add(new Product
                {
                    InventorySessionId = sessionId,
                    Ean = product.Ean,
                    Name = product.Name,
                    Category = product.Category,
                    Price = product.Price
                });
            }
        }
        await _context.SaveChangesAsync();
        return Ok(new { message = "Produtos atualizados com sucesso.", received = products.Count, processed = incomingProducts.Count });
    }

    [HttpPost("expected-stock/{sessionId}")]
    public async Task<IActionResult> ImportStock(Guid sessionId, [FromBody] List<ImportExpectedStock> stockItems)
    {
        var session = await _context.InventorySessions.AnyAsync(s => s.Id == sessionId);
        if (!session) return NotFound("Sessão não encontrada.");
        var incomingStock = stockItems
            .Where(item => !string.IsNullOrWhiteSpace(item.Ean))
            .GroupBy(item => item.Ean.Trim())
            .Select(group => new ImportExpectedStock
            {
                Ean = group.Key,
                ExpectedQuantity = group.Sum(item => item.ExpectedQuantity)
            })
            .ToList();

        var eans = incomingStock.Select(item => item.Ean).ToList();
        var productsByEan = await _context.Products
            .AsNoTracking()
            .Where(product => product.InventorySessionId == sessionId && product.DeletedAt == null && eans.Contains(product.Ean))
            .Select(product => new { product.Id, product.Ean })
            .ToDictionaryAsync(product => product.Ean, product => product.Id);

        var productIds = productsByEan.Values.ToList();
        var existingStocksByProductId = await _context.ExpectedStocks
            .Where(stock => stock.InventorySessionId == sessionId && stock.DeletedAt == null && productIds.Contains(stock.ProductId))
            .ToDictionaryAsync(stock => stock.ProductId);

        var notFoundEans = new List<string>();
        foreach (var item in incomingStock)
        {
            if (!productsByEan.TryGetValue(item.Ean, out var productId))
            {
                notFoundEans.Add(item.Ean);
                continue;
            }

            if (existingStocksByProductId.TryGetValue(productId, out var existingStock))
            {
                existingStock.ExpectedQuantity = item.ExpectedQuantity;
                existingStock.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.ExpectedStocks.Add(new ExpectedStock
                {
                    InventorySessionId = sessionId,
                    ProductId = productId,
                    ExpectedQuantity = item.ExpectedQuantity
                });
            }
        }

        await _context.SaveChangesAsync();

        if (notFoundEans.Count > 0)
        {
            return Ok(new { message = $"Estoque importado, mas os seguintes EANs não foram encontrados: {string.Join(", ", notFoundEans)}" });
        }

        return Ok(new { message = "Estoque do cliente importado.", received = stockItems.Count, processed = incomingStock.Count });
    }
}

public class ImportExpectedStock
{
    public required string Ean { get; set; }
    public int ExpectedQuantity { get; set; }
}
