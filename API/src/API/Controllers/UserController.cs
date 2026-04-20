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
    private readonly IMailService _mailService;

    public UserController(InventoryDbContext context, IMailService mailService)
    {
        _context = context;
        _mailService = mailService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        var users = await _context.Users
            .Select(u => new
            {
                u.Id,
                u.Role,
                u.Name,
                u.Email,
                password = u.Role == "COUNTER" ? u.PasswordString : null,
                u.TeamId,
                u.Team,
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

        string newPass;
        if (request.Password != null && request.Role == "COUNTER")
        {
            newPass = request.Password;
        }
        else
        {
            newPass = Guid.NewGuid().ToString().Substring(0, 8);
            await _mailService.SendEmailAsync(request.Email, "Bem-vindo ao sistema", $"Sua senha temporária é: {newPass}");
        }

        var user = new User
        {
            Name = request.Name,
            Email = request.Email.ToLower(),
            Role = request.Role,
            TeamId = request.TeamId,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPass),
            PasswordString = request.Role == "COUNTER" ? newPass : null,
            isRecovery = request.Password != null && request.Role == "COUNTER" ? false : true
        };


        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        Console.WriteLine($"Usuário criado: {user.Email} com senha temporária: {newPass}");
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
        public string Role { get; set; } = "COUNTER";
        public string? Password { get; set; } = null;
        public Guid TeamId { get; set; }

    }
}