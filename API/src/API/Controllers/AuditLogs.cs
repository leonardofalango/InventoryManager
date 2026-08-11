using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryManager.Infrastructure.Persistence; // Ajuste o namespace se necessário
using Microsoft.AspNetCore.Authorization;

namespace InventoryManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN")]
    public class AuditLogController : ControllerBase
    {
        private readonly InventoryDbContext _context;

        public AuditLogController(InventoryDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Retorna os logs do sistema. Sem paginação, mas com filtro de dias.
        /// </summary>
        /// <param name="days">Quantidade de dias para buscar para trás. Padrão: 30 dias.</param>
        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] int? days = 30,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                page = Math.Max(page, 1);
                pageSize = Math.Clamp(pageSize, 1, 500);

                var query = _context.AuditLogs.AsNoTracking();
                if (days.HasValue && days.Value > 0)
                {
                    var cutoffDate = DateTime.UtcNow.AddDays(-days.Value);
                    query = query.Where(l => l.Datetime >= cutoffDate);
                }

                var totalItems = await query.CountAsync();
                var logs = await query
                    .OrderByDescending(l => l.Datetime)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                return Ok(new
                {
                    data = logs,
                    totalItems,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao buscar os logs do sistema.", error = ex.Message });
            }
        }
    }
}
