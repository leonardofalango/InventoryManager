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
            .AsNoTracking()
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
            .AsNoTracking()
            .Where(p => p.InventorySessionId == sessionId && p.DeletedAt == null)
            .Select(p => new
            {
                p.Ean,
                p.Name,
                p.Category,
                p.Price
            })
            .ToDictionaryAsync(p => p.Ean);

        var expectedStocks = await DbContext.ExpectedStocks
            .AsNoTracking()
            .Where(es => es.InventorySessionId == sessionId && es.DeletedAt == null)
            .GroupBy(es => es.Product.Ean)
            .Select(g => new
            {
                Ean = g.Key,
                ExpectedQuantity = g.Sum(es => es.ExpectedQuantity)
            })
            .ToDictionaryAsync(es => es.Ean, es => es.ExpectedQuantity);

        var counts = await DbContext.InventoryCounts
            .AsNoTracking()
            .Where(c => c.InventorySessionId == sessionId && c.DeletedAt == null)
            .GroupBy(c => c.Ean)
            .Select(g => new
            {
                Ean = g.Key,
                CountedQuantity = g.Sum(c => c.Quantity)
            })
            .ToDictionaryAsync(c => c.Ean, c => c.CountedQuantity);

        var allEans = productsInfo.Keys
            .Union(expectedStocks.Keys)
            .Union(counts.Keys)
            .Distinct();

        var report = allEans.Select(ean =>
        {
            productsInfo.TryGetValue(ean, out var p);
            var expected = expectedStocks.GetValueOrDefault(ean, 0);
            var counted = counts.GetValueOrDefault(ean, 0);
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
