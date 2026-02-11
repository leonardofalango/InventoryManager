using InventoryManager.Domain.Entities;
using InventoryManager.Infrastructure.Persistence;

namespace InventoryManager.API.Data;

public static class DbInitializer
{
    public static void Initialize(InventoryDbContext context)
    {
        context.Database.EnsureCreated();

        if (context.Users.Any())
        {
            return;
        }

        var admin = new User
        {
            Name = "Administrador",
            Email = "admin@inventory.com",
            Role = "ADMIN",
            PasswordHash = "admin123"
        };

        context.Users.Add(admin);
        context.SaveChanges();
    }
}