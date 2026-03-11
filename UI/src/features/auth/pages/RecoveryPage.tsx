import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { api } from "../../../lib/axios";
import { useFeedbackStore } from "../../../store/feedbackStore";

export function RecoveryPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/recovery", { email });
      if (response.status === 200) {
        showFeedback(
          "Instruções de recuperação enviadas para o seu email!",
          "success",
        );
      }
      navigate("/login");
    } catch (err) {
      showFeedback("Erro ao enviar solicitação de recuperação.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <ArrowLeft
            onClick={() => navigate("/login")}
            className="text-white hover:text-sky-300 cursor-pointer"
          />
          <h1 className="text-3xl font-bold text-white mb-2">
            Inventory Manager
          </h1>
          <p className="text-gray-400">Receba sua senha por email</p>
        </div>

        <form onSubmit={handleRecovery} className="space-y-6">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-sky-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Recuperar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
