using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly InventoryDbContext _context;
    public InventoryController(InventoryDbContext context) => _context = context;

    [HttpPost("count")]
    public async Task<IActionResult> RegisterCount([FromBody] InventoryCount count)
    {
        var session = await _context.InventorySessions.FindAsync(count.InventorySessionId);
        if (session == null || session.Status == InventoryStatus.Closed)
            return BadRequest("Sessão de inventário inválida ou encerrada.");

        // verificar se ja possui uma contagem, se possuir, incrementar a versão
        var existingCount = await _context.InventoryCounts
            .Where(c => c.InventorySessionId == count.InventorySessionId && c.Ean == count.Ean)
            .OrderByDescending(c => c.CountVersion)
            .FirstOrDefaultAsync();

        if (existingCount != null)
            count.CountVersion = existingCount.CountVersion + 1;

        count.CountedAt = DateTime.UtcNow;
        _context.InventoryCounts.Add(count);
        await _context.SaveChangesAsync();

        return Ok();
    }
}