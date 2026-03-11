using InventoryManager.Infrastructure.Persistence;
using InventoryManager.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace InventoryManager.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly InventoryDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(InventoryDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Email ou senha inválidos" });
        }

        if (user.isRecovery)
        {
            return Ok(new
            {
                message = "Altere sua senha para continuar",
                recovery = true
            });
        }

        var token = GenerateJwtToken(user);

        return Ok(new
        {
            token = token,
            user = new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                role = user.Role.ToUpper()
            }
        });
    }

    [HttpPost("recovery")]
    public async Task<IActionResult> Recovery([FromBody] RecoveryRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null)
            return NotFound(new { message = "Usuário não encontrado" });

        var tempPassword = Guid.NewGuid().ToString().Substring(0, 8);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword);
        user.isRecovery = true;
        await _context.SaveChangesAsync();

        Console.WriteLine("tempPassword: " + tempPassword);

        //TODO connect email service and send password recovery
        return Ok(new { message = "Senha temporária gerada. Verifique seu email" });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null)
            return NotFound(new { message = "Usuário não encontrado" });

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Senha atual incorreta" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.isRecovery = false;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Senha alterada com sucesso" });
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = Encoding.ASCII.GetBytes(jwtSettings.GetValue<string>("Key") ?? "chave_padrao_muito_longa_para_dev_apenas");

        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString().ToUpper())
            ]),
            Expires = DateTime.UtcNow.AddHours(8),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
            Issuer = jwtSettings.GetValue<string>("Issuer"),
            Audience = jwtSettings.GetValue<string>("Audience")
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RecoveryRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}