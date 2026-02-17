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
    public async Task<IActionResult> ImportStock(Guid sessionId, [FromBody] List<ExpectedStock> stockItems)
    {
        var session = await _context.InventorySessions.AnyAsync(s => s.Id == sessionId);
        if (!session) return NotFound("Sessão não encontrada.");

        foreach (var item in stockItems)
        {
            item.InventorySessionId = sessionId;
            _context.ExpectedStocks.Add(item);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Estoque do cliente importado." });
    }
}