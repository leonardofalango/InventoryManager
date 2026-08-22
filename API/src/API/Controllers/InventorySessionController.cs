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
    private readonly bool _bypassEanValidation;

    public InventorySessionController(InventoryDbContext context, IConfiguration configuration)
    {
        _context = context;
        _bypassEanValidation = configuration.GetValue<bool>("Validation:BypassEanValidation");
    }

    [HttpGet("{id}/dashboard")]
    [Authorize(Roles = "ADMIN,MANAGER,COUNTER")]
    public async Task<IActionResult> GetDashboardStats(Guid id)
    {
        var session = await _context.InventorySessions
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new { s.ClientName, s.Status })
            .FirstOrDefaultAsync();

        if (session == null)
            return NotFound(new { message = "Sessão não encontrada." });

        var expectedStocks = await _context.ExpectedStocks
            .AsNoTracking()
            .Where(e => e.InventorySessionId == id && e.Product.DeletedAt == null)
            .GroupBy(e => e.Product.Ean)
            .Select(g => new
            {
                Ean = g.Key,
                ExpectedQuantity = g.Sum(e => e.ExpectedQuantity)
            })
            .ToListAsync();

        var totalSKUs = expectedStocks.Count;

        if (totalSKUs == 0)
        {
            totalSKUs = await _context.Products
                .AsNoTracking()
                .CountAsync(p => p.InventorySessionId == id && p.DeletedAt == null);
        }

        var countedPerEan = await _context.InventoryCounts
            .AsNoTracking()
            .Where(c => c.InventorySessionId == id && c.DeletedAt == null)
            .GroupBy(c => c.Ean)
            .Select(g => new { Ean = g.Key, TotalCount = g.Sum(c => c.Quantity) })
            .ToListAsync();

        var countedSKUs = countedPerEan.Count;
        var totalItems = countedPerEan.Sum(c => c.TotalCount);
        var expectedByEan = expectedStocks.ToDictionary(e => e.Ean, e => e.ExpectedQuantity);
        var countedByEan = countedPerEan.ToDictionary(c => c.Ean, c => c.TotalCount);

        var expectedEans = expectedByEan.Keys;
        var countedEans = countedPerEan.Select(c => c.Ean);
        var allEans = expectedEans.Union(countedEans).Distinct();

        int divergences = 0;
        foreach (var ean in allEans)
        {
            var expectedQty = expectedByEan.GetValueOrDefault(ean, 0);
            var countedQty = countedByEan.GetValueOrDefault(ean, 0);

            if (expectedQty != countedQty)
            {
                divergences++;
            }
        }
        var oneHourAgo = DateTime.UtcNow.AddHours(-1);
        var activeCounters = await _context.InventoryCounts
            .AsNoTracking()
            .Where(c => c.InventorySessionId == id && c.DeletedAt == null && c.CountedAt >= oneHourAgo)
            .Select(c => c.UserId)
            .Distinct()
            .CountAsync();

        var recentCounts = await (
            from c in _context.InventoryCounts.AsNoTracking()
            join p in _context.Products.AsNoTracking().Where(p => p.InventorySessionId == id && p.DeletedAt == null)
                on c.Ean equals p.Ean into products
            from p in products.DefaultIfEmpty()
            join pl in _context.ProductLocations.AsNoTracking()
                on c.ProductLocationId equals pl.Id into locations
            from pl in locations.DefaultIfEmpty()
            where c.InventorySessionId == id && c.DeletedAt == null
            orderby c.CountedAt descending
            select new
            {
                Ean = c.Ean,
                ProductName = p != null ? p.Name : "Produto Desconhecido",
                ProductLocation = pl != null ? pl.Barcode : "N/A",
                Quantity = c.Quantity,
                CountedAt = c.CountedAt
            })
            .Take(10)
            .ToListAsync();

        var activeLocations = await _context.ProductLocations
            .AsNoTracking()
            .Where(pl => pl.InventorySessionId == id && pl.DeletedAt == null)
            .Select(pl => new { pl.Id, pl.Barcode })
            .ToListAsync();

        var countsByLocation = await _context.InventoryCounts
            .AsNoTracking()
            .Where(c => c.InventorySessionId == id && c.DeletedAt == null && c.ProductLocationId != null)
            .GroupBy(c => c.ProductLocationId!.Value)
            .Select(g => new
            {
                ProductLocationId = g.Key,
                TotalQuantity = g.Sum(c => c.Quantity)
            })
            .ToDictionaryAsync(g => g.ProductLocationId, g => g.TotalQuantity);

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

        int totalLocations = activeLocations.Count;

        int totalLocationsCounted = countsByLocation.Count;

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
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new { s.Status })
            .FirstOrDefaultAsync();

        if (session == null) return NotFound();

        var countSummary = await _context.InventoryCounts
            .AsNoTracking()
            .Where(c => c.InventorySessionId == id && c.DeletedAt == null)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalCounts = g.Count(),
                UniqueProductsCounted = g.Select(c => c.Ean).Distinct().Count()
            })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            totalCounts = countSummary?.TotalCounts ?? 0,
            uniqueProducts = countSummary?.UniqueProductsCounted ?? 0,
            status = session.Status
        });
    }

    [HttpPost("{id}/count")]
    [Authorize(Roles = "ADMIN,COUNTER,MANAGER")]
    public async Task<IActionResult> RegisterCount(Guid id, [FromBody] RegisterCountRequest request)
    {
        if (!TryGetUserId(out Guid userId))
        {
            return Unauthorized(new { message = "Usuario nao identificado no token." });
        }

        var validationMessage = ValidateCountRequest(request, _bypassEanValidation);
        if (validationMessage != null)
            return BadRequest(new { message = validationMessage });

        if (request.ClientCountId.HasValue)
        {
            var existingCount = await _context.InventoryCounts
                .AsNoTracking()
                .Where(c => c.ClientCountId == request.ClientCountId.Value)
                .Select(c => new
                {
                    c.Id,
                    c.Ean,
                    c.CountedAt
                })
                .FirstOrDefaultAsync();

            if (existingCount != null)
            {
                return Ok(new
                {
                    message = "Contagem ja registrada anteriormente.",
                    duplicate = true,
                    countId = existingCount.Id,
                    ean = existingCount.Ean,
                    countedAt = existingCount.CountedAt
                });
            }
        }

        var session = await _context.InventorySessions.FindAsync(id);
        if (session == null)
            return NotFound(new { message = "Sessao de inventario nao encontrada." });

        if (session.Status == InventoryStatus.Closed)
            return BadRequest(new { message = "Esta sessao de inventario ja esta encerrada." });

        if (session.Status == InventoryStatus.Open)
        {
            session.Status = InventoryStatus.InProgress;
        }

        var inventoryCount = new InventoryCount
        {
            InventorySessionId = id,
            UserId = userId,
            Ean = request.Ean.Trim(),
            ProductLocationId = request.ProductLocationId,
            Quantity = request.Quantity,
            CountedAt = NormalizeCountedAt(request.CountedAt),
            CountVersion = request.CountVersion,
            ClientCountId = request.ClientCountId
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

    [HttpPost("{id}/counts/batch")]
    [Authorize(Roles = "ADMIN,COUNTER,MANAGER")]
    public async Task<IActionResult> RegisterCountsBatch(Guid id, [FromBody] RegisterCountsBatchRequest request)
    {
        if (!TryGetUserId(out Guid userId))
        {
            return Unauthorized(new { message = "Usuario nao identificado no token." });
        }

        if (request.Counts.Count == 0)
            return BadRequest(new { message = "Nenhuma leitura foi enviada para sincronizacao." });

        if (request.Counts.Count > 500)
            return BadRequest(new { message = "Envie no maximo 500 leituras por lote." });

        var validationErrors = request.Counts
            .Select((count, index) => new { Index = index, Message = ValidateCountRequest(count, _bypassEanValidation) })
            .Where(item => item.Message != null)
            .ToList();

        if (validationErrors.Count > 0)
        {
            return BadRequest(new
            {
                message = "Uma ou mais leituras do lote estao invalidas.",
                errors = validationErrors.Select(item => $"Leitura {item.Index + 1}: {item.Message}")
            });
        }

        var duplicatedClientIds = request.Counts
            .Where(count => count.ClientCountId.HasValue)
            .GroupBy(count => count.ClientCountId!.Value)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToList();

        if (duplicatedClientIds.Count > 0)
        {
            return BadRequest(new { message = "O lote contem leituras repetidas pelo mesmo identificador local." });
        }

        var session = await _context.InventorySessions.FindAsync(id);
        if (session == null)
            return NotFound(new { message = "Sessao de inventario nao encontrada." });

        if (session.Status == InventoryStatus.Closed)
            return BadRequest(new { message = "Esta sessao de inventario ja esta encerrada." });

        var clientIds = request.Counts
            .Where(count => count.ClientCountId.HasValue)
            .Select(count => count.ClientCountId!.Value)
            .ToList();

        var existingClientIds = clientIds.Count == 0
            ? new HashSet<Guid>()
            : await _context.InventoryCounts
                .AsNoTracking()
                .Where(count => count.ClientCountId.HasValue && clientIds.Contains(count.ClientCountId.Value))
                .Select(count => count.ClientCountId!.Value)
                .ToHashSetAsync();

        var countsToCreate = request.Counts
            .Where(count => !count.ClientCountId.HasValue || !existingClientIds.Contains(count.ClientCountId.Value))
            .Select(count => new InventoryCount
            {
                InventorySessionId = id,
                UserId = userId,
                Ean = count.Ean.Trim(),
                ProductLocationId = count.ProductLocationId,
                Quantity = count.Quantity,
                CountedAt = NormalizeCountedAt(count.CountedAt),
                CountVersion = count.CountVersion,
                ClientCountId = count.ClientCountId
            })
            .ToList();

        if (session.Status == InventoryStatus.Open && countsToCreate.Count > 0)
        {
            session.Status = InventoryStatus.InProgress;
        }

        if (countsToCreate.Count > 0)
        {
            _context.InventoryCounts.AddRange(countsToCreate);
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            message = "Lote de contagens processado com sucesso.",
            received = request.Counts.Count,
            registered = countsToCreate.Count,
            duplicates = request.Counts.Count - countsToCreate.Count
        });
    }

    private bool TryGetUserId(out Guid userId)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdString, out userId);
    }

    private static string? ValidateCountRequest(RegisterCountRequest request, bool bypassEanValidation)
    {
        if (string.IsNullOrWhiteSpace(request.Ean))
            return "Informe o EAN lido.";

        var normalizedEan = request.Ean.Trim();
        if (normalizedEan.Length > 16)
            return "EAN invalido. Use um codigo de ate 16 digitos.";

        if (!normalizedEan.All(char.IsDigit))
            return "EAN inválido. O código deve conter apenas números.";

        if (bypassEanValidation)
            return ValidateCountMetadata(request);

        if (normalizedEan.Length < 8)
            return "EAN invalido. Use um codigo entre 8 e 16 digitos.";

        return ValidateCountMetadata(request);
    }

    private static string? ValidateCountMetadata(RegisterCountRequest request)
    {
        if (request.ProductLocationId == Guid.Empty)
            return "Informe uma localizacao valida antes de registrar a leitura.";

        if (request.Quantity <= 0)
            return "A quantidade deve ser maior que zero.";

        if (request.CountVersion <= 0)
            return "A versao da contagem deve ser maior que zero.";

        return null;
    }

    private static DateTime NormalizeCountedAt(DateTime? countedAt)
    {
        var value = countedAt ?? DateTime.UtcNow;

        return value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
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

        var result = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.TeamId,
                ActiveSession = _context.InventorySessions
                    .AsNoTracking()
                    .Where(s =>
                        s.DeletedAt == null &&
                        u.TeamId != null &&
                        s.TeamId == u.TeamId &&
                        (u.Role == "COUNTER"
                            ? s.Status == InventoryStatus.InProgress
                            : s.Status == InventoryStatus.Open || s.Status == InventoryStatus.InProgress))
                    .OrderByDescending(s => s.StartDate)
                    .Select(s => new
                    {
                        s.Id,
                        s.ClientName,
                        s.Status
                    })
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync();

        if (result == null || result.TeamId == null)
        {
            return NotFound(new { message = "Você não está vinculado a nenhuma equipe. Contate o gestor." });
        }

        if (result.ActiveSession == null)
        {
            return NotFound(new { message = "Nenhum inventário em andamento para a sua equipe no momento." });
        }

        return Ok(new
        {
            id = result.ActiveSession.Id,
            clientName = result.ActiveSession.ClientName,
            status = result.ActiveSession.Status
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
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.InventorySessions
            .AsNoTracking()
            .Where(s => s.DeletedAt == null)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = $"%{search.Trim()}%";
            query = query.Where(s => EF.Functions.ILike(s.ClientName, searchTerm));
        }

        if (allInventories != true)
        {
            query = query.Where(s => s.Status == InventoryStatus.Open || s.Status == InventoryStatus.InProgress);
        }

        var totalItems = await query.CountAsync();

        var sessions = await query
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
                TotalItemsCounted = s.Counts
                    .Where(c => c.DeletedAt == null)
                    .Sum(c => c.Quantity),
                UniqueItemsCounted = s.Counts
                    .Where(c => c.DeletedAt == null)
                    .Select(c => c.Ean)
                    .Distinct()
                    .Count()
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
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<ActionResult<IEnumerable<DiscrepancyItemDto>>> GetDiscrepancies(Guid sessionId)
    {
        var expectedRows = await _context.ExpectedStocks
            .AsNoTracking()
            .Where(e => e.InventorySessionId == sessionId && e.DeletedAt == null && e.Product.DeletedAt == null)
            .GroupBy(e => e.Product.Ean)
            .Select(g => new
            {
                Ean = g.Key,
                ExpectedQuantity = g.Sum(e => e.ExpectedQuantity),
                ProductName = g.Select(e => e.Product.Name).FirstOrDefault()
            })
            .ToListAsync();

        var expectedStocks = expectedRows.ToDictionary(e => e.Ean, e => e.ExpectedQuantity);
        var productNames = expectedRows
            .Where(e => !string.IsNullOrWhiteSpace(e.ProductName))
            .ToDictionary(e => e.Ean, e => e.ProductName!);

        var countedRows = await _context.InventoryCounts
            .AsNoTracking()
            .Where(c => c.InventorySessionId == sessionId && c.DeletedAt == null)
            .Select(c => new
            {
                c.Ean,
                c.Quantity,
                ProductLocation = c.ProductLocation != null ? c.ProductLocation.Barcode : "N/A"
            })
            .GroupBy(c => new { c.Ean, c.ProductLocation })
            .Select(g => new
            {
                g.Key.Ean,
                g.Key.ProductLocation,
                TotalCounted = g.Sum(x => x.Quantity)
            })
            .ToListAsync();

        var actualCounts = countedRows
            .GroupBy(c => c.Ean)
            .ToDictionary(g => g.Key, g => g.Sum(c => c.TotalCounted));

        var productLocationsByEan = countedRows
            .GroupBy(c => c.Ean)
            .ToDictionary(
                g => g.Key,
                g => string.Join(
                    ", ",
                    g.OrderBy(c => c.ProductLocation)
                        .Select(c => $"{c.ProductLocation} ({c.TotalCounted})")
                )
            );

        var allEans = expectedStocks.Keys
            .Union(actualCounts.Keys)
            .Distinct()
            .ToList();

        var discrepancyValues = allEans
            .Select(ean => new
            {
                Ean = ean,
                ExpectedQuantity = expectedStocks.GetValueOrDefault(ean, 0),
                CountedQuantity = actualCounts.GetValueOrDefault(ean, 0)
            })
            .Where(item => item.ExpectedQuantity != item.CountedQuantity)
            .ToList();

        var missingProductNameEans = discrepancyValues
            .Select(item => item.Ean)
            .Where(ean => !productNames.ContainsKey(ean))
            .ToList();

        if (missingProductNameEans.Count > 0)
        {
            var productNameRows = await _context.Products
                .AsNoTracking()
                .Where(p =>
                    p.InventorySessionId == sessionId &&
                    p.DeletedAt == null &&
                    missingProductNameEans.Contains(p.Ean))
                .Select(p => new { p.Ean, p.Name })
                .ToListAsync();

            foreach (var productGroup in productNameRows.GroupBy(p => p.Ean))
            {
                productNames[productGroup.Key] = productGroup
                    .Select(p => p.Name)
                    .FirstOrDefault(name => !string.IsNullOrWhiteSpace(name)) ?? "Produto Não Cadastrado";
            }
        }

        var discrepancies = discrepancyValues
            .Select(item => new DiscrepancyItemDto
            {
                Ean = item.Ean,
                Description = productNames.GetValueOrDefault(item.Ean, "Produto Não Cadastrado"),
                ProductLocations = productLocationsByEan.GetValueOrDefault(item.Ean, "N/A"),
                ExpectedQuantity = item.ExpectedQuantity,
                CountedQuantity = item.CountedQuantity
            })
            .OrderByDescending(d => Math.Abs(d.Difference))
            .ToList();

        return Ok(discrepancies);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> DeleteSession(Guid id)
    {
        var session = await _context.InventorySessions.FindAsync(id);
        if (session == null)
            return NotFound(new { message = "Sessão de inventário não encontrada." });

        var now = DateTime.UtcNow;
        await using var transaction = await _context.Database.BeginTransactionAsync();

        await _context.InventoryCounts
            .Where(c => c.InventorySessionId == id && c.DeletedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(c => c.DeletedAt, now));

        await _context.ExpectedStocks
            .Where(es => es.InventorySessionId == id && es.DeletedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(es => es.DeletedAt, now));

        await _context.Products
            .Where(p => p.InventorySessionId == id && p.DeletedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(p => p.DeletedAt, now));

        await _context.ProductLocations
            .Where(pl => pl.InventorySessionId == id && pl.DeletedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(pl => pl.DeletedAt, now));

        session.DeletedAt = now;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { message = "Sessão de inventário excluída com sucesso." });
    }
}

public class RegisterCountRequest
{
    public string Ean { get; set; } = string.Empty;
    public Guid ProductLocationId { get; set; }
    public int Quantity { get; set; } = 1;
    public int CountVersion { get; set; } = 1;
    public DateTime? CountedAt { get; set; }
    public Guid? ClientCountId { get; set; }
}

public class RegisterCountsBatchRequest
{
    public List<RegisterCountRequest> Counts { get; set; } = new();
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
    public string ProductLocations { get; set; } = "N/A";
    public int ExpectedQuantity { get; set; }
    public int CountedQuantity { get; set; }
    public int Difference => CountedQuantity - ExpectedQuantity;
}
