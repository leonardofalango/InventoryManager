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
            .Where(c => c.InventorySessionId == sessionId)
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
}