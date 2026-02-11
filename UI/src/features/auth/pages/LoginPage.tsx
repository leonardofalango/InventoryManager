import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { Lock, Mail, Loader2 } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, SvLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    SvLoading(true);
    setTimeout(() => {
      login(email);
      SvLoading(false);
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Inventory Manager
          </h1>
          <p className="text-gray-400">Acesse para gerenciar inventários</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={20}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 pl-10 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={20}
              />
              <input
                type="password"
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 pl-10 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-sky-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
