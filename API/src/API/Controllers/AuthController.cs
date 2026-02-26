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

        // TODO: implement hash
        // if (user == null || !BCrypt.Net.Bcrypt.Verify(request.Password, user.PasswordHash))
        if (user == null || user.PasswordHash != request.Password)
        {
            return Unauthorized(new { message = "Email ou senha inválidos" });
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