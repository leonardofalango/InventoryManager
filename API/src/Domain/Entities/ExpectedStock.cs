namespace InventoryManager.Domain.Entities;

public class ExpectedStock
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InventorySessionId { get; set; }
    public string Ean { get; set; } = string.Empty;
    public int ExpectedQuantity { get; set; }

    public InventorySession InventorySession { get; set; } = null!;
}