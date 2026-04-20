namespace InventoryManager.Domain.Entities;

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Ean { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public Guid InventorySessionId { get; set; }
    public InventorySession? InventorySession { get; set; }
    public ICollection<ExpectedStock> ExpectedStocks { get; set; } = new List<ExpectedStock>();
}