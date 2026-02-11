using InventoryManager.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.Infrastructure.Persistence;

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<InventorySession> InventorySessions { get; set; }
    public DbSet<InventoryCount> InventoryCounts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<InventoryCount>()
            .HasIndex(c => c.InventorySessionId);

        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Ean)
            .IsUnique();
    }
}