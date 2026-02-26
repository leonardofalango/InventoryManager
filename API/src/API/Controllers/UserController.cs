using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN,MANAGER")]
public class UserController : ControllerBase
{
    private readonly InventoryDbContext _context;

    public UserController(InventoryDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        var users = await _context.Users
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                u.Role,
                u.TeamId,
                Team = u.Team
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost]
    public async Task<ActionResult<User>> CreateUser([FromBody] CreateUserRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return BadRequest("E-mail já cadastrado.");
        }

        var user = new User
        {
            Name = request.Name,
            Email = request.Email.ToLower(),
            Role = request.Role,
            TeamId = request.TeamId,
            PasswordHash = request.Password,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUsers), new { id = user.Id }, user);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] User user)
    {
        if (id != user.Id) return BadRequest("ID do usuário não corresponde.");

        var existingUser = await _context.Users.FindAsync(id);
        if (existingUser == null) return NotFound("Usuário não encontrado.");

        existingUser.Name = user.Name;
        existingUser.Role = user.Role;
        existingUser.TeamId = user.TeamId;
        Console.WriteLine($"TEAMID RECEBIDO: {user.TeamId}");

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!_context.Users.Any(u => u.Id == id))
                return NotFound();
            else
                throw;
        }

        return NoContent();
    }

    public class CreateUserRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "COUNTER";
        public Guid TeamId { get; set; }

    }
}