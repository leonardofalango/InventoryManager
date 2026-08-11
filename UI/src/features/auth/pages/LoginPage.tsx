import { useEffect, useState } from "react";
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
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      setViewportHeight(Math.floor(height));
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    window.visualViewport?.addEventListener("resize", updateViewportHeight);

    return () => {
      window.removeEventListener("resize", updateViewportHeight);
      window.visualViewport?.removeEventListener("resize", updateViewportHeight);
    };
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== repeatNewPassword) {
      showFeedback("As senhas não são iguais", "error");
      return;
    }

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-[100dvh] w-full overflow-y-auto bg-gray-900 md:flex md:items-center md:justify-center md:p-4"
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-5 px-5 py-5 focus-within:justify-start focus-within:pb-24 md:min-h-0 md:gap-6 md:bg-gray-800 md:p-8 md:rounded-xl md:shadow-2xl md:border md:border-gray-700 md:focus-within:justify-center md:focus-within:pb-8">
        <div className="text-center flex shrink-0 justify-center">
          <img
            src={logo}
            alt="Inventory Manager"
            className="w-3/5 max-w-[190px] object-contain drop-shadow-lg md:w-full md:max-w-[250px] md:drop-shadow-none"
          />
        </div>

        {!recoveryMode ? (
          <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
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
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="email"
                  enterKeyHint="next"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 md:bg-gray-700 border-2 md:border border-gray-700 md:border-gray-600 rounded-xl md:rounded-lg py-3.5 md:py-3 pl-12 md:pl-10 px-4 text-base text-textAccent placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
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
                  autoComplete="current-password"
                  enterKeyHint="done"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 md:bg-gray-700 border-2 md:border border-gray-700 md:border-gray-600 rounded-xl md:rounded-lg py-3.5 md:py-3 pl-12 md:pl-10 px-4 text-base text-textAccent placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 md:py-2 mt-2 md:mt-0 font-bold bg-accent text-textAccent hover:bg-accent/80 active:bg-accent/90 md:font-bold text-base uppercase md:normal-case tracking-wide md:tracking-normal rounded-xl md:rounded-lg shadow-lg md:shadow-none transition-all flex items-center justify-center gap-2"
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
              className="w-full mt-3 md:mt-2 text-gray-400 hover:text-red-400 active:text-textAccent transition-colors flex items-center justify-center text-sm p-2 md:p-0"
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleChangePassword}
            className="space-y-4 md:space-y-6"
          >
            <h1 className="text-textAccent w-full text-center text-lg font-bold mb-4 hidden md:block">
              Alterando senha
            </h1>
            <div className="bg-blue-900/30 border border-blue-500/50 p-3 rounded-xl mb-3 md:hidden">
              <h1 className="text-blue-400 text-center text-base font-bold">
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
                  autoComplete="new-password"
                  enterKeyHint="next"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800 md:bg-gray-700 border-2 md:border border-gray-700 md:border-gray-600 rounded-xl md:rounded-lg py-3.5 md:py-3 pl-12 md:pl-10 px-4 text-base text-textAccent placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
                  autoComplete="new-password"
                  enterKeyHint="done"
                  value={repeatNewPassword}
                  onChange={(e) => setRepeatNewPassword(e.target.value)}
                  className="w-full bg-gray-800 md:bg-gray-700 border-2 md:border border-gray-700 md:border-gray-600 rounded-xl md:rounded-lg py-3.5 md:py-3 pl-12 md:pl-10 px-4 text-base text-textAccent placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 md:py-2 mt-2 md:mt-0 bg-accent hover:bg-accent/80 active:bg-accent/90 md:text-textAccent text-gray-900 font-extrabold md:font-bold text-base uppercase md:normal-case tracking-wide md:tracking-normal rounded-xl md:rounded-lg transition-all flex items-center justify-center gap-2"
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
