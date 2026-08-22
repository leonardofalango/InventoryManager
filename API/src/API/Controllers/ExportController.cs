using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

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

    [HttpGet("counts-by-location/{sessionId}")]
    [Produces("text/csv")]
    public async Task<IActionResult> ExportCountsByLocation(Guid sessionId)
    {
        var session = await DbContext.InventorySessions
            .AsNoTracking()
            .Where(s => s.Id == sessionId && s.DeletedAt == null)
            .Select(s => new { s.ClientName, s.Status })
            .FirstOrDefaultAsync();

        if (session == null)
            return NotFound(new { message = "Inventario nao encontrado." });

        if (session.Status != InventoryStatus.Closed)
            return BadRequest(new { message = "Finalize o inventario antes de baixar o CSV." });

        var rows = await DbContext.InventoryCounts
            .AsNoTracking()
            .Where(c => c.InventorySessionId == sessionId && c.DeletedAt == null)
            .Select(c => new
            {
                c.Ean,
                c.Quantity,
                Position = c.ProductLocation != null ? c.ProductLocation.Barcode : "N/A"
            })
            .GroupBy(c => new { c.Ean, c.Position })
            .Select(g => new
            {
                g.Key.Ean,
                QuantityRead = g.Sum(c => c.Quantity),
                g.Key.Position
            })
            .OrderBy(r => r.Position)
            .ThenBy(r => r.Ean)
            .ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("Ean,Quantidade");

        foreach (var row in rows)
        {
            csv
                .Append(EscapeCsvValue(row.Ean))
                .Append(',')
                .Append(row.QuantityRead)
                .AppendLine();
        }

        var csvBytes = Encoding.UTF8.GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(csv.ToString()))
            .ToArray();

        var filename = $"leituras_{SanitizeFileName(session.ClientName, sessionId.ToString())}.csv";
        return File(csvBytes, "text/csv; charset=utf-8", filename);
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

    private static string EscapeCsvValue(string? value)
    {
        var safeValue = value ?? string.Empty;
        var mustQuote = safeValue.Contains(',') ||
            safeValue.Contains('"') ||
            safeValue.Contains('\n') ||
            safeValue.Contains('\r');

        return mustQuote ? $"\"{safeValue.Replace("\"", "\"\"")}\"" : safeValue;
    }

    private static string SanitizeFileName(string value, string fallback)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new string(
            value
                .Select(character => invalidChars.Contains(character) ? '_' : character)
                .ToArray()
        ).Trim();

        return string.IsNullOrWhiteSpace(sanitized) ? fallback : sanitized;
    }
}
