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

    [HttpGet("{id}/dashboard")]
    [Authorize(Roles = "ADMIN,MANAGER,COUNTER")]
    public async Task<IActionResult> GetDashboardStats(Guid id)
    {
        var session = await _context.InventorySessions
            .Include(s => s.Counts)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (session == null)
            return NotFound(new { message = "Sessão não encontrada." });

        var expectedStocks = await _context.ExpectedStocks
            .Where(e => e.InventorySessionId == id)
            .ToListAsync();

        var totalSKUs = expectedStocks.Count;

        if (totalSKUs == 0) totalSKUs = await _context.Products.CountAsync();

        var countedSKUs = session.Counts.Select(c => c.Ean).Distinct().Count();
        var totalItems = session.Counts.Sum(c => c.Quantity);

        var countedPerEan = session.Counts
            .GroupBy(c => c.Ean)
            .Select(g => new { Ean = g.Key, TotalCount = g.Sum(c => c.Quantity) })
            .ToList();

        int divergences = 0;

        if (expectedStocks.Any())
        {
            foreach (var counted in countedPerEan)
            {
                var expected = expectedStocks.FirstOrDefault(e => e.Ean == counted.Ean)?.ExpectedQuantity ?? 0;
                if (expected != counted.TotalCount) divergences++;
            }
        }
        else
        {
            var eans = countedPerEan.Select(c => c.Ean).ToList();
            var products = await _context.Products.Where(p => eans.Contains(p.Ean)).ToListAsync();
            foreach (var counted in countedPerEan)
            {
                var expected = products.FirstOrDefault(p => p.Ean == counted.Ean)?.StockQuantity ?? 0;
                if (expected != counted.TotalCount) divergences++;
            }
        }

        var activeCounters = session.Counts
            .Where(c => c.CountedAt >= DateTime.UtcNow.AddHours(-1))
            .Select(c => c.UserId)
            .Distinct()
            .Count();

        var recentCounts = await _context.InventoryCounts
            .Where(c => c.InventorySessionId == id)
            .OrderByDescending(c => c.CountedAt)
            .Take(5)
            .Select(c => new
            {
                Ean = c.Ean,
                ProductName = _context.Products.Where(p => p.Ean == c.Ean).Select(p => p.Name).FirstOrDefault() ?? "Produto Desconhecido",
                ProductLocation = c.ProductLocationId.ToString(),
                Quantity = c.Quantity,
                CountedAt = c.CountedAt
            })
            .ToListAsync();

        var sectors = session.Counts
            .GroupBy(c => c.ProductLocationId)
            .Select(g => new
            {
                name = g.Key.ToString().Substring(0, 8).ToUpper(),
                percent = totalItems > 0 ? Math.Round((double)g.Sum(c => c.Quantity) / totalItems * 100, 2) : 0
            })
            .OrderByDescending(s => s.percent)
            .Take(5)
            .ToList();

        int progress = totalSKUs > 0 ? (int)Math.Round((double)countedSKUs / totalSKUs * 100) : 0;
        if (progress > 100) progress = 100;

        return Ok(new
        {
            clientName = session.ClientName,
            status = session.Status.ToString(),
            progress,
            totalSKUs,
            countedSKUs,
            totalItems,
            divergences,
            activeCounters,
            recentCounts,
            sectors
        });
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<ActionResult<InventorySession>> CreateSession([FromBody] CreateSessionRequest request)
    {
        var session = new InventorySession
        {
            ClientName = request.ClientName,
            StartDate = request.StartDate.ToUniversalTime(),
            TeamId = request.TeamId,
            EndDate = request.EndDate?.ToUniversalTime(),
            Status = InventoryStatus.Open,
        };

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
            ProductLocationId = request.ProductLocationId,
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

    [HttpGet]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> GetAllSessions()
    {
        var sessions = await _context.InventorySessions
            .Include(s => s.Counts)
            .OrderByDescending(s => s.StartDate)
            .Select(s => new
            {
                s.Id,
                s.ClientName,
                s.Status,
                s.StartDate,
                s.EndDate,
                s.TeamId,
                TotalItemsCounted = s.Counts.Sum(c => c.Quantity),
                UniqueItemsCounted = s.Counts.Select(c => c.Ean).Distinct().Count()
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> UpdateSessionStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var session = await _context.InventorySessions.FindAsync(id);

        if (session == null)
            return NotFound(new { message = "Sessão de inventário não encontrada." });

        session.Status = request.Status;
        if (request.Status == InventoryStatus.Closed)
        {
            session.EndDate = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Status atualizado com sucesso.", status = session.Status });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> UpdateSessionDetails(Guid id, [FromBody] UpdateSessionRequest request)
    {
        var session = await _context.InventorySessions.FindAsync(id);

        if (session == null)
            return NotFound(new { message = "Sessão de inventário não encontrada." });

        session.ClientName = request.ClientName;
        session.TeamId = request.TeamId;
        session.StartDate = request.StartDate == default ? session.StartDate : request.StartDate.ToUniversalTime();
        session.EndDate = request.EndDate?.ToUniversalTime();

        await _context.SaveChangesAsync();

        return Ok(new { message = "Inventário atualizado com sucesso." });
    }
}

public class RegisterCountRequest
{
    public string Ean { get; set; } = string.Empty;
    public Guid ProductLocationId { get; set; }
    public int Quantity { get; set; } = 1;
    public int CountVersion { get; set; } = 1;
}

public class UpdateStatusRequest
{
    public InventoryStatus Status { get; set; }
}

public class CreateSessionRequest
{
    public string ClientName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public Guid? TeamId { get; set; }
}

public class UpdateSessionRequest
{
    public string ClientName { get; set; } = string.Empty;
    public Guid? TeamId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}