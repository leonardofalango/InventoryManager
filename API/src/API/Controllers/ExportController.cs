using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN,MANAGER")]
public class ExportController : ControllerBase
{
    private readonly InventoryDbContext DbContext;

    public ExportController(InventoryDbContext dbContext)
    {
        DbContext = dbContext;
    }

    [HttpGet("raw-data/{sessionId}")]
    public async Task<IActionResult> ExportRawData(Guid sessionId)
    {
        var data = await DbContext.InventoryCounts
            .Where(c => c.InventorySessionId == sessionId && c.DeletedAt == null)
            .Select(c => new
            {
                c.ProductLocationId,
                c.Ean,
                c.Quantity,
                c.CountedAt,
                c.UserId,
                c.CountVersion
            })
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("full-report/{sessionId}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> ExportFullReport(Guid sessionId)
    {
        var productsInfo = await DbContext.Products
            .Where(p => p.InventorySessionId == sessionId && p.DeletedAt == null)
            .Select(p => new
            {
                p.Ean,
                p.Name,
                p.Category,
                p.Price
            })
            .ToListAsync();

        var expectedStocks = await DbContext.ExpectedStocks
            .Where(es => es.InventorySessionId == sessionId && es.DeletedAt == null)
            .Select(es => new
            {
                Ean = es.Product.Ean,
                es.ExpectedQuantity
            })
            .ToListAsync();

        var counts = await DbContext.InventoryCounts
            .Where(c => c.InventorySessionId == sessionId && c.DeletedAt == null)
            .GroupBy(c => c.Ean)
            .Select(g => new
            {
                Ean = g.Key,
                CountedQuantity = g.Sum(c => c.Quantity)
            })
            .ToListAsync();

        var allEans = productsInfo.Select(p => p.Ean)
            .Union(expectedStocks.Select(e => e.Ean))
            .Union(counts.Select(c => c.Ean))
            .Distinct();

        var report = allEans.Select(ean =>
        {
            var p = productsInfo.FirstOrDefault(x => x.Ean == ean);

            var expected = expectedStocks
                .Where(x => x.Ean == ean)
                .Sum(x => x.ExpectedQuantity);

            var counted = counts.FirstOrDefault(x => x.Ean == ean)?.CountedQuantity ?? 0;
            var difference = counted - expected;

            return new
            {
                Ean = ean,
                Name = p?.Name ?? "Produto Não Cadastrado",
                Category = p?.Category ?? "-",
                Price = p?.Price ?? 0,
                ExpectedQuantity = expected,
                CountedQuantity = counted,
                Difference = difference,
                AbsoluteDifference = Math.Abs(difference)
            };
        })
        .OrderByDescending(r => r.AbsoluteDifference)
        .ToList();

        return Ok(report);
    }
}