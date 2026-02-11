using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventorySessionController : ControllerBase
{
    private readonly InventoryDbContext _context;

    public InventorySessionController(InventoryDbContext context) => _context = context;

    [HttpPost]
    public async Task<ActionResult<InventorySession>> CreateSession([FromBody] InventorySession session)
    {
        session.StartDate = DateTime.UtcNow;
        session.Status = InventoryStatus.Open;
        _context.InventorySessions.Add(session);
        await _context.SaveChangesAsync();
        return Ok(session);
    }

    [HttpGet("{id}/progress")]
    public async Task<IActionResult> GetProgress(Guid id)
    {
        var session = await _context.InventorySessions
            .Include(s => s.Counts)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (session == null) return NotFound();

        var uniqueProductsCounted = session.Counts.Select(c => c.Ean).Distinct().Count();

        return Ok(new
        {
            totalCounts = session.Counts.Count,
            uniqueProducts = uniqueProductsCounted,
            status = session.Status
        });
    }
}