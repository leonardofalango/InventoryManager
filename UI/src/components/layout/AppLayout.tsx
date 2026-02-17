import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  CirclePile,
  ClipboardList,
  LogOut,
  ScanLine,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../../store/authStore";
import { useFeedbackStore } from "../../store/feedbackStore";
import type { Role } from "../../types";

const MENU_ITEMS: { path: string; label: string; icon: any; roles: Role[] }[] =
  [
    {
      path: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/inventory",
      label: "Inventários",
      icon: ClipboardList,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/stock",
      label: "Estoque",
      icon: CirclePile,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/products",
      label: "Produtos",
      icon: Package,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/team",
      label: "Equipe",
      icon: Users,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      path: "/scan",
      label: "Coletor",
      icon: ScanLine,
      roles: ["ADMIN", "COUNTER"],
    },
  ];

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogOut = () => {
    logout();
    showFeedback("Logout realizado com sucesso!", "success");
    navigate("/login");
  };

  const allowedMenus = MENU_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  );
  return (
    <div className="flex h-screen bg-gray-900">
      {user?.role !== "COUNTER" && (
        <aside className="w-64 bg-primary text-white flex flex-col hidden md:flex">
          <div className="p-6 border-b border-gray-700">
            <h1 className="text-2xl font-bold tracking-tight">
              InventoryManager
            </h1>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {allowedMenus.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-accent text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white",
                  )}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogOut}
              className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 w-full"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-auto py-2 flex flex-col">
        <header className="bg-gray-900 shadow-sm h-20 flex items-center px-8 justify-between shrink-0 border-b border-gray-800">
          <h2 className="text-white text-lg flex items-center gap-4">
            {user?.role === "COUNTER" && (
              <span className="font-bold text-accent">Modo Coletor</span>
            )}
            <div>
              Bem vindo,{" "}
              <strong className="text-accent">{user?.name || "Usuário"}</strong>
              <p className="text-sm text-gray-500">
                {user?.role === "ADMIN"
                  ? "Administrador"
                  : user?.role === "MANAGER"
                    ? "Gestor"
                    : "Colaborador"}
              </p>
            </div>
          </h2>
          {user?.role === "COUNTER" && (
            <button
              onClick={handleLogOut}
              className="text-red-400 hover:text-red-300 flex gap-2"
            >
              <LogOut size={20} /> Sair
            </button>
          )}
        </header>

        <div
          className={clsx(
            "flex-1 overflow-auto",
            user?.role === "COUNTER" ? "p-4" : "p-8",
          )}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
