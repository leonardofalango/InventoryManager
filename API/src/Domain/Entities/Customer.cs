namespace InventoryManager.Domain.Entities;

public class Customer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Document { get; set; } = string.Empty;
    public ICollection<InventorySession> Sessions { get; set; } = new List<InventorySession>();
}