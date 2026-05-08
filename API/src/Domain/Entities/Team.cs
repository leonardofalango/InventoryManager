namespace InventoryManager.Domain.Entities;

public class Team : IAuditEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    [System.Text.Json.Serialization.JsonIgnore]
    public ICollection<User> Members { get; set; } = new List<User>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}