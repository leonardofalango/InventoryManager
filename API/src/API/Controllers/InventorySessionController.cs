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
                .ThenInclude(c => c.ProductLocation)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (session == null)
            return NotFound(new { message = "Sessão não encontrada." });

        var expectedStocks = await _context.ExpectedStocks
            .Include(e => e.Product)
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

        var expectedEans = expectedStocks.Where(e => e.Product != null).Select(e => e.Product!.Ean);
        var countedEans = countedPerEan.Select(c => c.Ean);
        var allEans = expectedEans.Union(countedEans).Distinct();

        int divergences = 0;
        foreach (var ean in allEans)
        {
            var expectedQty = expectedStocks.FirstOrDefault(e => e.Product?.Ean == ean && e.Product.DeletedAt == null)?.ExpectedQuantity ?? 0;

            var countedQty = countedPerEan.FirstOrDefault(c => c.Ean == ean)?.TotalCount ?? 0;

            if (expectedQty != countedQty)
            {
                divergences++;
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
            .Take(10)
            .Select(c => new
            {
                Ean = c.Ean,
                ProductName = _context.Products.Where(p => p.Ean == c.Ean && p.DeletedAt == null).Select(p => p.Name).FirstOrDefault() ?? "Produto Desconhecido",
                ProductLocation = c.ProductLocation != null ? c.ProductLocation.Barcode.ToString() : "N/A",
                Quantity = c.Quantity,
                CountedAt = c.CountedAt
            })
            .ToListAsync();

        var activeLocations = await _context.ProductLocations
            .Where(pl => pl.InventorySessionId == id && pl.DeletedAt == null)
            .ToListAsync();

        var countsByLocation = session.Counts
            .Where(c => c.ProductLocationId != null)
            .GroupBy(c => c.ProductLocationId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(c => c.Quantity));

        var sectors = activeLocations
            .Select(loc =>
            {
                var qty = countsByLocation.GetValueOrDefault(loc.Id, 0);
                return new
                {
                    name = loc.Barcode,
                    percent = totalItems > 0 ? Math.Round((double)qty / totalItems * 100, 2) : 0
                };
            })
            .OrderByDescending(s => s.percent)
            .ThenBy(s => s.name)
            .ToList();

        int progress = totalSKUs > 0 ? (int)Math.Round((double)countedSKUs / totalSKUs * 100) : 0;
        if (progress > 100) progress = 100;

        int totalLocations = await _context.ProductLocations.Where(
            pl => pl.InventorySessionId == id && pl.DeletedAt == null
        ).CountAsync();

        int totalLocationsCounted = session.Counts
            .Where(c => c.ProductLocationId != null)
            .Select(c => c.ProductLocationId)
            .Distinct()
            .Count();

        return Ok(new
        {
            clientName = session.ClientName,
            status = session.Status,
            progress,
            totalSKUs,
            countedSKUs,
            totalItems,
            divergences,
            totalLocations,
            totalLocationsCounted,
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
    public async Task<IActionResult> GetAllSessions(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] string? search = null,
    [FromQuery] bool? allInventories = null
    )
    {
        var query = _context.InventorySessions
            .Include(s => s.Counts)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(s => s.ClientName.ToLower().Contains(searchLower));
        }

        var totalItems = await query.CountAsync();

        var sessions = await query
            .Where(s => allInventories == null ? s.Status == InventoryStatus.Open || s.Status == InventoryStatus.InProgress : true)
            .OrderByDescending(s => s.StartDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        return Ok(new
        {
            data = sessions,
            totalItems,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
        });
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

    [HttpGet("{sessionId}/dashboard/discrepancies")]
    public async Task<ActionResult<IEnumerable<DiscrepancyItemDto>>> GetDiscrepancies(Guid sessionId)
    {
        var expectedStocks = await _context.ExpectedStocks
            .Include(e => e.Product)
            .Where(e => e.InventorySessionId == sessionId)
            .ToListAsync();

        var actualCounts = await _context.InventoryCounts
            .Include(c => c.ProductLocation)
            .Where(c => c.InventorySessionId == sessionId)
            .GroupBy(c => new { c.Ean, c.ProductLocation.Description })
            .Select(g => new
            {
                Ean = g.Key.Ean,
                Description = g.Key.Description,
                TotalCounted = g.Sum(x => x.Quantity)
            })
            .ToListAsync();

        var discrepancies = new List<DiscrepancyItemDto>();

        foreach (var expected in expectedStocks)
        {
            var countRecord = actualCounts.FirstOrDefault(c => c.Ean == expected.Product?.Ean);
            var countedQty = countRecord?.TotalCounted ?? 0;

            if (countedQty != expected.ExpectedQuantity)
            {
                discrepancies.Add(new DiscrepancyItemDto
                {
                    Ean = expected.Product?.Ean,
                    Description = expected.Product?.Name ?? "Descrição não disponível",
                    ExpectedQuantity = expected.ExpectedQuantity,
                    CountedQuantity = countedQty
                });
            }
        }

        var unexpectedCounts = actualCounts.Where(c => !expectedStocks.Any(e => e.Product?.Ean == c.Ean));
        foreach (var unexpected in unexpectedCounts)
        {
            discrepancies.Add(new DiscrepancyItemDto
            {
                Ean = unexpected.Ean,
                Description = unexpected.Description ?? "Descrição não disponível",
                ExpectedQuantity = 0,
                CountedQuantity = unexpected.TotalCounted
            });
        }

        return Ok(discrepancies.OrderByDescending(d => Math.Abs(d.Difference)));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSession(Guid id)
    {
        var session = await _context.InventorySessions.FindAsync(id);
        if (session == null)
            return NotFound(new { message = "Sessão de inventário não encontrada." });

        _context.InventorySessions.Remove(session);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Sessão de inventário excluída com sucesso." });
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

public class DiscrepancyItemDto
{
    public string? Ean { get; set; }
    public string? Description { get; set; }
    public int ExpectedQuantity { get; set; }
    public int CountedQuantity { get; set; }
    public int Difference => CountedQuantity - ExpectedQuantity;
}