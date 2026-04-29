import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { Lock, Mail, Loader2 } from "lucide-react";
import { api } from "../../../lib/axios";
import { useFeedbackStore } from "../../../store/feedbackStore";
import logo from "../../../assets/absolutaloglogo.png";

export function LoginPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatNewPassword, setRepeatNewPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.recovery === true) {
        showFeedback(
          "Conta em modo de recuperação. Por favor, altere sua senha.",
          "info",
        );
        setRecoveryMode(true);
        return;
      }
      useAuthStore.getState().login(response.data.token, response.data.user);

      showFeedback("Login realizado com sucesso!", "success");
      navigate("/");
    } catch (err) {
      showFeedback("Erro ao entrar: Verifique suas credenciais.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword !== repeatNewPassword) {
      showFeedback("As senhas não são iguais", "error");
      return;
    }

    try {
      const response = await api.post("/auth/change-password", {
        email,
        currentPassword: password,
        newPassword,
      });

      if (response.status === 200) {
        showFeedback("Senha alterada com sucesso!", "success");
      }

      setRecoveryMode(false);
      setPassword("");
      setNewPassword("");
      setRepeatNewPassword("");
    } catch (err) {
      showFeedback("Erro ao trocar senha.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center p-0 md:p-4">
      <div className="w-full h-screen md:h-auto max-w-md bg-gray-900 md:bg-gray-800 flex flex-col justify-center p-6 md:p-8 md:rounded-xl md:shadow-2xl md:border md:border-gray-700 space-y-8 md:space-y-6">
        <div className="text-center flex justify-center mb-4 md:mb-8">
          <img
            src={logo}
            alt="Inventory Manager"
            className="w-4/5 md:w-full max-w-[250px] object-contain drop-shadow-lg md:drop-shadow-none"
          />
        </div>

        {!recoveryMode ? (
          <form onSubmit={handleLogin} className="space-y-5 md:space-y-6">
            <div>
              <label className="hidden md:block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 md:text-gray-500"
                  size={20}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 md:bg-gray-700 border-2 md:border border-gray-700 md:border-gray-600 rounded-xl md:rounded-lg py-4 md:py-3 pl-12 md:pl-10 px-4 text-lg md:text-base text-textAccent placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="hidden md:block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 md:text-gray-500"
                  size={20}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 md:bg-gray-700 border-2 md:border border-gray-700 md:border-gray-600 rounded-xl md:rounded-lg py-4 md:py-3 pl-12 md:pl-10 px-4 text-lg md:text-base text-textAccent placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 md:py-2 mt-2 md:mt-0 font-bold bg-accent text-textAccent hover:bg-accent/80 active:bg-accent/90 md:font-bold text-lg md:text-base uppercase md:normal-case tracking-wide md:tracking-normal rounded-xl md:rounded-lg shadow-lg md:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Entrar"
              )}
            </button>

            <button
              onClick={() => navigate("/recovery")}
              type="button"
              disabled={loading}
              className="w-full mt-4 md:mt-2 text-gray-400 hover:text-red-400 active:text-textAccent transition-colors flex items-center justify-center text-sm p-2 md:p-0"
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleChangePassword}
            className="space-y-5 md:space-y-6"
          >
            <h1 className="text-textAccent w-full text-center text-lg font-bold mb-4 hidden md:block">
              Alterando senha
            </h1>
            <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-xl mb-4 md:hidden">
              <h1 className="text-blue-400 text-center text-lg font-bold">
                Ação Necessária
              </h1>
              <p className="text-gray-300 text-sm text-center mt-1">
                Crie uma nova senha para continuar
              </p>
            </div>

            <div>
              <label className="hidden md:block text-sm font-medium text-gray-300 mb-2">
                Nova senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 md:text-gray-500"
                  size={20}
                />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800 md:bg-gray-700 border-2 md:border border-gray-700 md:border-gray-600 rounded-xl md:rounded-lg py-4 md:py-3 pl-12 md:pl-10 px-4 text-lg md:text-base text-textAccent placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="hidden md:block text-sm font-medium text-gray-300 mb-2">
                Repita a senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 md:text-gray-500"
                  size={20}
                />
                <input
                  type="password"
                  required
                  value={repeatNewPassword}
                  onChange={(e) => setRepeatNewPassword(e.target.value)}
                  className="w-full bg-gray-800 md:bg-gray-700 border-2 md:border border-gray-700 md:border-gray-600 rounded-xl md:rounded-lg py-4 md:py-3 pl-12 md:pl-10 px-4 text-lg md:text-base text-textAccent placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 md:py-2 mt-2 md:mt-0 bg-accent hover:bg-accent/80 active:bg-accent/90 md:text-textAccent text-gray-900 font-extrabold md:font-bold text-lg md:text-base uppercase md:normal-case tracking-wide md:tracking-normal rounded-xl md:rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Alterar senha"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
