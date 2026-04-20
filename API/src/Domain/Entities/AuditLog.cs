namespace InventoryManager.Domain.Entities
{
    public class AuditLog
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Log { get; set; } = string.Empty;
        public DateTime Datetime { get; set; }
        public string? TableName { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? AffectedColumns { get; set; }
        public string? PrimaryKey { get; set; }
    }
}