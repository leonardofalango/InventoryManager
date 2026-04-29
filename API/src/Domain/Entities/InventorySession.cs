namespace InventoryManager.Domain.Entities;

public enum InventoryStatus { Open, InProgress, Closed }

public class InventorySession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ClientName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public InventoryStatus Status { get; set; } = InventoryStatus.Open;
    // Times e contagem
    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }
    public ICollection<InventoryCount> Counts { get; set; } = new List<InventoryCount>();

    // Produto, estoque, localização
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<ExpectedStock> ExpectedStocks { get; set; } = new List<ExpectedStock>();
    public ICollection<ProductLocation> ProductLocations { get; set; } = new List<ProductLocation>();
}