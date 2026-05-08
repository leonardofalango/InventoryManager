namespace InventoryManager.Domain.Entities;

public class ProductLocation : IAuditEntity
{
    public Guid Id { get; set; }
    public required string Barcode { get; set; }
    public string? Description { get; set; }
    public Guid? InventorySessionId { get; set; }
    public InventorySession? InventorySession { get; set; }
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public ICollection<InventoryCount>? InventoryCounts { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}