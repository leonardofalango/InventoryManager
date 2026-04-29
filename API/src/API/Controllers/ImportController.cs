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

    [HttpPost("products")]
    public async Task<IActionResult> ImportProducts([FromBody] List<Product> products)
    {
        foreach (var product in products)
        {
            var existing = await _context.Products.FirstOrDefaultAsync(p => p.Ean == product.Ean);
            if (existing != null)
            {
                existing.Name = product.Name;
                existing.Category = product.Category;
                existing.Price = product.Price;
            }
            else
            {
                _context.Products.Add(product);
            }
        }
        await _context.SaveChangesAsync();
        return Ok(new { message = "Produtos atualizados com sucesso." });
    }

    [HttpPost("expected-stock/{sessionId}")]
    public async Task<IActionResult> ImportStock(Guid sessionId, [FromBody] List<ImportExpectedStock> stockItems)
    {
        var session = await _context.InventorySessions.AnyAsync(s => s.Id == sessionId);
        if (!session) return NotFound("Sessão não encontrada.");
        string notFoundEans = string.Empty;
        foreach (var item in stockItems)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Ean == item.Ean);
            if (product == null)
            {
                notFoundEans += $"{item.Ean}, ";
                continue;
            }

            var expectedStock = new ExpectedStock
            {
                InventorySessionId = sessionId,
                ProductId = product.Id,
                Product = product,
                ExpectedQuantity = item.ExpectedQuantity
            };
            _context.ExpectedStocks.Add(expectedStock);
        }

        await _context.SaveChangesAsync();

        if (!string.IsNullOrEmpty(notFoundEans))
        {
            return Ok(new { message = $"Estoque importado, mas os seguintes EANs não foram encontrados: {notFoundEans.TrimEnd(',', ' ')}" });
        }

        return Ok(new { message = "Estoque do cliente importado." });
    }
}

public class ImportExpectedStock
{
    public required string Ean { get; set; }
    public int ExpectedQuantity { get; set; }
}