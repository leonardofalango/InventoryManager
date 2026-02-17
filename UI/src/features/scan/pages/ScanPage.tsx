import { useState, useRef, useEffect } from "react";
import { Camera, MapPin, ScanLine, AlertCircle, PackageX } from "lucide-react";
import { useFeedbackStore } from "../../../store/feedbackStore";
import { api } from "../../../lib/axios";
import type { ActiveSession } from "../types/scan-types";

export function ScanPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    null,
  );
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [locationId, setLocationId] = useState<string>("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedItems, setScannedItems] = useState<
    { id: string; code: string; time: string }[]
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        const response = await api.get("/inventorysession/active");
        setActiveSession(response.data);
      } catch (error: any) {
        setActiveSession(null);
      } finally {
        setIsLoadingSession(false);
      }
    };

    fetchActiveSession();
  }, []);

  useEffect(() => {
    if (!activeSession) return;

    const focusInput = () => inputRef.current?.focus();
    document.addEventListener("click", focusInput);
    focusInput();
    return () => document.removeEventListener("click", focusInput);
  }, [activeSession]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim() || !activeSession) return;

    if (!isLocationLocked) {
      setLocationId(barcodeInput);
      setIsLocationLocked(true);
      showFeedback(`Prateleira ${barcodeInput} confirmada.`, "success");
      setBarcodeInput("");
      return;
    }

    const productCode = barcodeInput;
    setBarcodeInput("");

    try {
      const response = await api.post(
        `/inventorysession/${activeSession.id}/count`,
        {
          ean: productCode,
          shelfId: locationId,
          quantity: 1,
          countVersion: 1,
        },
      );

      setScannedItems((prev) => [
        {
          id: response.data.countId,
          code: productCode,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      showFeedback(`Lido: ${productCode}`, "success");
    } catch (error: any) {
      showFeedback(
        error.response?.data?.message || "Erro ao registrar produto",
        "error",
      );
    }
  };

  if (isLoadingSession) {
    return (
      <div className="text-white text-center mt-10">
        Buscando inventário ativo...
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-gray-800 p-8 rounded-xl border border-gray-700 text-center flex flex-col items-center gap-4">
        <PackageX size={64} className="text-gray-500" />
        <h2 className="text-xl font-bold text-white">
          Nenhum inventário ativo
        </h2>
        <p className="text-gray-400">
          Você ou sua equipe não possuem nenhum inventário em andamento
          designado para hoje. Aguarde o gestor iniciar a sessão.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-full flex flex-col gap-4">
      <div className="bg-accent/20 border border-accent/50 p-3 rounded-lg text-center">
        <p className="text-accent text-sm font-bold uppercase tracking-wider">
          Inventário Ativo
        </p>
        <p className="text-white font-semibold text-lg">
          {activeSession.clientName}
        </p>
      </div>

      <form
        onSubmit={handleScanSubmit}
        className="opacity-0 w-0 h-0 overflow-hidden absolute"
      >
        <input
          ref={inputRef}
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          autoFocus
        />
        <button type="submit">Scan</button>
      </form>

      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <MapPin className="text-accent" />
            {isLocationLocked ? `Prateleira: ${locationId}` : "Ler Prateleira"}
          </h2>
          {isLocationLocked && (
            <button
              onClick={() => setIsLocationLocked(false)}
              className="text-xs text-red-400 underline p-1"
            >
              Trocar Local
            </button>
          )}
        </div>

        {!isLocationLocked && (
          <div className="bg-yellow-900/50 border border-yellow-700 p-3 rounded-lg flex gap-3">
            <AlertCircle className="text-yellow-500 shrink-0" />
            <p className="text-sm text-yellow-200">
              Faça a leitura da etiqueta da prateleira para iniciar.
            </p>
          </div>
        )}
      </div>

      <button
        className={`p-6 rounded-xl flex flex-col items-center justify-center gap-4 transition-colors ${
          !isLocationLocked
            ? "bg-gray-800 text-gray-500"
            : "bg-accent hover:bg-accent/90 text-white"
        }`}
        disabled={!isLocationLocked}
      >
        <Camera size={48} />
        <span className="font-semibold text-lg">Câmera Web</span>
      </button>

      <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex gap-2 items-center text-white">
          <ScanLine size={18} />
          <h3 className="font-semibold">Últimas Leituras</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {scannedItems.length === 0 ? (
            <p className="text-gray-500 text-center mt-4">
              Nenhum item lido na prateleira atual.
            </p>
          ) : (
            scannedItems.map((item) => (
              <div
                key={item.id}
                className="bg-gray-700 p-3 rounded-lg flex justify-between items-center animate-fade-in"
              >
                <span className="text-white font-mono">{item.code}</span>
                <span className="text-gray-400 text-sm">{item.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
