import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  CirclePile,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../../store/authStore";
import { useFeedbackStore } from "../../store/feedbackStore";

const MENU_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/inventory", label: "Inventários", icon: ClipboardList },
  { path: "/stock", label: "Estoque", icon: CirclePile },
  { path: "/products", label: "Produtos", icon: Package },
  { path: "/team", label: "Equipe", icon: Users },
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

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold tracking-tight">
            InventoryManager
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {MENU_ITEMS.map((item) => {
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto py-2">
        <header className="bg-gray-900 shadow-sm h-20 flex items-center px-8 justify-between">
          <h2 className="text-white text-lg">
            Bem vindo,{" "}
            <strong className="text-accent">{user?.name || "Usuário"}</strong>
            <p className="text-sm text-gray-500">
              {user?.role === "ADMIN" ? "Administrador" : "Colaborador"}
            </p>
          </h2>
        </header>

        <div className="p-8">
          {/* Render */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
