namespace InventoryManager.Domain.Entities;

public class InventoryCount : IAuditEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid InventorySessionId { get; set; }
    public InventorySession InventorySession { get; set; } = null!;

    public string Ean { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public Guid? ProductLocationId { get; set; }
    public ProductLocation ProductLocation { get; set; }

    public Guid UserId { get; set; }
    public DateTime CountedAt { get; set; } = DateTime.UtcNow;
    public int CountVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}