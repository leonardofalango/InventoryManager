using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventoryManager.Infrastructure.Persistence; // Ajuste o namespace se necessário

namespace InventoryManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize(Roles = "Admin")]
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
        public async Task<IActionResult> GetLogs([FromQuery] int? days = 30)
        {
            try
            {
                var query = _context.AuditLogs.AsNoTracking();
                if (days.HasValue && days.Value > 0)
                {
                    var cutoffDate = DateTime.UtcNow.AddDays(-days.Value);
                    query = query.Where(l => l.Datetime >= cutoffDate);
                }

                var logs = await query
                    .OrderByDescending(l => l.Datetime)
                    .ToListAsync();

                return Ok(logs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao buscar os logs do sistema.", error = ex.Message });
            }
        }
    }
}