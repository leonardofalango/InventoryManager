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

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] List<Product> products)
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
        return Ok(new { message = $"{products.Count} produtos processados." });
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetProducts()
        => await _context.Products.ToListAsync();
}