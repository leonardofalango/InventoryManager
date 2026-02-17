using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventorySessionController : ControllerBase
{
    private readonly InventoryDbContext _context;

    public InventorySessionController(InventoryDbContext context) => _context = context;

    [HttpPost]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<ActionResult<InventorySession>> CreateSession([FromBody] InventorySession session)
    {
        session.StartDate = DateTime.UtcNow;
        session.Status = InventoryStatus.Open;
        _context.InventorySessions.Add(session);
        await _context.SaveChangesAsync();
        return Ok(session);
    }

    [HttpGet("{id}/progress")]
    [Authorize(Roles = "ADMIN,MANAGER")]
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

    [HttpPost("{id}/count")]
    [Authorize(Roles = "ADMIN,COUNTER,MANAGER")]
    public async Task<IActionResult> RegisterCount(Guid id, [FromBody] RegisterCountRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
        {
            return Unauthorized(new { message = "Usuário não identificado no token." });
        }

        var session = await _context.InventorySessions.FindAsync(id);

        if (session == null)
            return NotFound(new { message = "Sessão de inventário não encontrada." });

        if (session.Status == InventoryStatus.Closed)
            return BadRequest(new { message = "Esta sessão de inventário já está encerrada." });

        if (session.Status == InventoryStatus.Open)
        {
            session.Status = InventoryStatus.InProgress;
        }

        var inventoryCount = new InventoryCount
        {
            InventorySessionId = id,
            UserId = userId,
            Ean = request.Ean,
            ShelfId = request.ShelfId,
            Quantity = request.Quantity,
            CountedAt = DateTime.UtcNow,
            CountVersion = request.CountVersion
        };

        _context.InventoryCounts.Add(inventoryCount);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Contagem registrada com sucesso",
            countId = inventoryCount.Id,
            ean = inventoryCount.Ean,
            countedAt = inventoryCount.CountedAt
        });
    }

    [HttpGet("active")]
    [Authorize(Roles = "ADMIN,MANAGER,COUNTER")]
    public async Task<IActionResult> GetActiveSessionForUser()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId))
        {
            return Unauthorized(new { message = "Usuário inválido." });
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null || user.TeamId == null)
        {
            return NotFound(new { message = "Você não está vinculado a nenhuma equipe. Contate o gestor." });
        }

        var activeSession = await _context.InventorySessions
            .Where(s => s.TeamId == user.TeamId &&
                       (s.Status == InventoryStatus.Open || s.Status == InventoryStatus.InProgress))
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();

        if (activeSession == null)
        {
            return NotFound(new { message = "Nenhum inventário em andamento para a sua equipe no momento." });
        }

        return Ok(new
        {
            id = activeSession.Id,
            clientName = activeSession.ClientName,
            status = activeSession.Status
        });
    }
}

public class RegisterCountRequest
{
    public string Ean { get; set; } = string.Empty;
    public string ShelfId { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public int CountVersion { get; set; } = 1;
}