namespace InventoryManager.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? PasswordString { get; set; } = null;
    public string Role { get; set; } = "COUNTER";
    public bool isRecovery { get; set; } = false;
    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }
}