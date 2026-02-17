namespace InventoryManager.Domain.Entities;

public enum InventoryStatus { Open, InProgress, Closed }

public class InventorySession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ClientName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public InventoryStatus Status { get; set; } = InventoryStatus.Open;
    //// Team association
    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }
    public ICollection<InventoryCount> Counts { get; set; } = new List<InventoryCount>();
}