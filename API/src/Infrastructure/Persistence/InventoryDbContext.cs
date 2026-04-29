using InventoryManager.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using System.Text.Json;

namespace InventoryManager.Infrastructure.Persistence;

public class InventoryDbContext : DbContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    public InventoryDbContext(
        DbContextOptions<InventoryDbContext> options,
        IHttpContextAccessor httpContextAccessor
    ) : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Team> Teams { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<InventorySession> InventorySessions { get; set; }
    public DbSet<InventoryCount> InventoryCounts { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<ExpectedStock> ExpectedStocks { get; set; }
    public DbSet<ProductLocation> ProductLocations { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<User>()
            .HasOne(u => u.Team)
            .WithMany(t => t.Members)
            .HasForeignKey(u => u.TeamId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<InventoryCount>()
            .HasIndex(c => c.InventorySessionId);

        modelBuilder.Entity<Product>()
            .HasIndex(p => new { p.Ean, p.InventorySessionId })
            .IsUnique();

        modelBuilder.Entity<ProductLocation>()
            .HasIndex(pl => new { pl.InventorySessionId, pl.Barcode })
            .IsUnique();

        modelBuilder.Entity<ExpectedStock>()
            .HasOne(es => es.Product)
            .WithMany(p => p.ExpectedStocks)
            .HasForeignKey(es => es.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ExpectedStock>()
            .HasOne(es => es.InventorySession)
            .WithMany()
            .HasForeignKey(es => es.InventorySessionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Product>()
            .HasOne(p => p.InventorySession)
            .WithMany(s => s.Products)
            .HasForeignKey(p => p.InventorySessionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductLocation>()
            .HasOne(pl => pl.InventorySession)
            .WithMany(s => s.ProductLocations)
            .HasForeignKey(pl => pl.InventorySessionId)
            .OnDelete(DeleteBehavior.SetNull);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditEntries = OnBeforeSaveChanges();
        var result = await base.SaveChangesAsync(cancellationToken);

        await OnAfterSaveChanges(auditEntries);
        return result;
    }
    private List<AuditEntry> OnBeforeSaveChanges()
    {
        ChangeTracker.DetectChanges();
        var auditEntries = new List<AuditEntry>();
        var userId = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
             ?? "Sistema/Anônimo";

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            var auditEntry = new AuditEntry(entry)
            {
                TableName = entry.Metadata.GetTableName() ?? entry.Entity.GetType().Name,
                UserId = userId
            };
            auditEntries.Add(auditEntry);

            foreach (var property in entry.Properties)
            {
                if (property.IsTemporary)
                {
                    auditEntry.TemporaryProperties.Add(property);
                    continue;
                }

                string propertyName = property.Metadata.Name;
                if (property.Metadata.IsPrimaryKey())
                {
                    auditEntry.KeyValues[propertyName] = property.CurrentValue;
                    continue;
                }

                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.NewValues[propertyName] = property.CurrentValue;
                        auditEntry.AuditType = "Create";
                        break;

                    case EntityState.Deleted:
                        auditEntry.OldValues[propertyName] = property.OriginalValue;
                        auditEntry.AuditType = "Delete";
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            auditEntry.OldValues[propertyName] = property.OriginalValue;
                            auditEntry.NewValues[propertyName] = property.CurrentValue;
                            auditEntry.ChangedColumns.Add(propertyName);
                            auditEntry.AuditType = "Update";
                        }
                        break;
                }
            }
        }

        return auditEntries.Where(_ => !_.HasTemporaryProperties).ToList();
    }
    private Task OnAfterSaveChanges(List<AuditEntry> auditEntries)
    {
        if (auditEntries == null || auditEntries.Count == 0)
            return Task.CompletedTask;

        foreach (var auditEntry in auditEntries)
        {
            AuditLogs.Add(auditEntry.ToAudit());
        }

        return base.SaveChangesAsync();
    }

    public class AuditEntry
    {
        public AuditEntry(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry)
        {
            Entry = entry;
        }
        public Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry Entry { get; }
        public string UserId { get; set; }
        public string TableName { get; set; }
        public Dictionary<string, object?> KeyValues { get; } = new();
        public Dictionary<string, object?> OldValues { get; } = new();
        public Dictionary<string, object?> NewValues { get; } = new();
        public List<Microsoft.EntityFrameworkCore.ChangeTracking.PropertyEntry> TemporaryProperties { get; } = new();
        public string AuditType { get; set; }
        public List<string> ChangedColumns { get; } = new();
        public bool HasTemporaryProperties => TemporaryProperties.Any();

        public AuditLog ToAudit()
        {
            var audit = new AuditLog
            {
                UserId = UserId,
                Type = AuditType,
                TableName = TableName,
                Datetime = DateTime.UtcNow,
                PrimaryKey = JsonSerializer.Serialize(KeyValues),
                OldValues = OldValues.Count == 0 ? null : JsonSerializer.Serialize(OldValues),
                NewValues = NewValues.Count == 0 ? null : JsonSerializer.Serialize(NewValues),
                AffectedColumns = ChangedColumns.Count == 0 ? null : JsonSerializer.Serialize(ChangedColumns)
            };
            return audit;
        }
    }
}