namespace InventoryManager.Domain.Entities;

public class ProductLocation
{
    public Guid Id { get; set; }
    public string? Barcode { get; set; }
    public string? Description { get; set; }
    public Guid? CustomerId { get; set; } 
    
    public Customer? Customer { get; set; }
    public ICollection<InventoryCount>? InventoryCounts { get; set; }
}