namespace InventoryManager.Domain.Entities;

public class ExpectedStock
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid InventorySessionId { get; set; }
    public InventorySession? InventorySession { get; set; }

    public Guid ProductId { get; set; }
    public required Product Product { get; set; }

    public int ExpectedQuantity { get; set; }
}