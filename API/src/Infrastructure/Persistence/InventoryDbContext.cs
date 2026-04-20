using InventoryManager.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InventoryManager.Infrastructure.Persistence;

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Team> Teams { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<InventorySession> InventorySessions { get; set; }
    public DbSet<InventoryCount> InventoryCounts { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<ExpectedStock> ExpectedStocks { get; set; }
    public DbSet<ProductLocation> ProductLocations { get; set; }

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
}