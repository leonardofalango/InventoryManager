import { useState, useRef, useEffect } from "react";
import {
  Camera,
  MapPin,
  ScanLine,
  AlertCircle,
  PackageX,
  X,
  Keyboard,
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
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
  const [manualInput, setManualInput] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [scannedItems, setScannedItems] = useState<
    { id: string; code: string; time: string }[]
  >([]);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

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

  // Foco no input escondido (para coletores físicos)
  useEffect(() => {
    if (!activeSession || isCameraOpen) return;
    const focusInput = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName !== "INPUT") {
        hiddenInputRef.current?.focus();
      }
    };
    document.addEventListener("click", focusInput);
    hiddenInputRef.current?.focus();
    return () => document.removeEventListener("click", focusInput);
  }, [activeSession, isCameraOpen]);

  // Scanner de Câmera
  useEffect(() => {
    if (!isCameraOpen) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        // Desativa a opção de upar arquivo de imagem que estava te atrapalhando
        supportedScanTypes: [0],
      },
      false,
    );

    scanner.render(
      (decodedText) => {
        processBarcode(decodedText);
      },
      () => {},
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [isCameraOpen, isLocationLocked]);

  const processBarcode = async (code: string) => {
    if (!code.trim() || !activeSession) return;

    if (!isLocationLocked) {
      setLocationId(code);
      setIsLocationLocked(true);
      showFeedback(`Prateleira ${code} confirmada.`, "success");
      return;
    }

    try {
      const response = await api.post(
        `/inventorysession/${activeSession.id}/count`,
        {
          ean: code,
          productLocationId: locationId,
          quantity: 1,
          countVersion: 1,
        },
      );

      setScannedItems((prev) => [
        {
          id: response.data?.countId || Math.random().toString(),
          code: code,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      showFeedback(`Lido: ${code}`, "success");
    } catch (error: any) {
      showFeedback(
        error.response?.data?.message || "Erro ao registrar produto",
        "error",
      );
    }
  };

  const handleHiddenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(barcodeInput);
    setBarcodeInput("");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(manualInput);
    setManualInput("");
  };

  if (isLoadingSession)
    return (
      <div className="text-white text-center mt-10">
        Buscando inventário ativo...
      </div>
    );

  if (!activeSession) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-gray-800 p-8 rounded-xl border border-gray-700 text-center flex flex-col items-center gap-4">
        <PackageX size={64} className="text-gray-500" />
        <h2 className="text-xl font-bold text-white">
          Nenhum inventário ativo
        </h2>
        <p className="text-gray-400">Aguarde o gestor iniciar a sessão.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-full flex flex-col gap-4">
      <form
        onSubmit={handleHiddenSubmit}
        className="opacity-0 w-0 h-0 overflow-hidden absolute"
      >
        <input
          ref={hiddenInputRef}
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
      </div>

      {/* --- CAMPO DE DIGITAÇÃO MANUAL (SEMPRE VISÍVEL AGORA) --- */}
      <form
        onSubmit={handleManualSubmit}
        className="bg-gray-800 p-4 rounded-xl border border-gray-700"
      >
        <label className="text-sm text-gray-400 mb-2 font-semibold flex items-center gap-2">
          <Keyboard size={16} />
          {isLocationLocked
            ? "Digitar Código do Produto"
            : "Digitar Código da Prateleira"}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={isLocationLocked ? "Ex: 789102030" : "Ex: PRAT-001"}
            className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-3 text-white outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="bg-accent hover:bg-accent/90 px-6 py-2 rounded text-white font-semibold"
          >
            OK
          </button>
        </div>
      </form>

      {/* --- BOTÃO / ÁREA DA CÂMERA --- */}
      {!isCameraOpen ? (
        <button
          onClick={() => setIsCameraOpen(true)}
          className="p-4 rounded-xl flex items-center justify-center gap-3 transition-colors bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
        >
          <Camera size={24} />
          <span className="font-semibold">Abrir Câmera</span>
        </button>
      ) : (
        <div className="bg-white p-2 rounded-xl border-4 border-accent relative">
          <button
            onClick={() => setIsCameraOpen(false)}
            className="absolute top-2 right-2 z-10 bg-red-600 text-white p-2 rounded-full shadow-lg"
          >
            <X size={20} />
          </button>
          <div id="reader" className="w-full"></div>
        </div>
      )}

      {/* --- HISTÓRICO --- */}
      <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col min-h-[200px]">
        <div className="p-4 border-b border-gray-700 flex gap-2 items-center text-white">
          <ScanLine size={18} />
          <h3 className="font-semibold">Últimas Leituras</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {scannedItems.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 p-3 rounded-lg flex justify-between items-center border border-gray-600"
            >
              <span className="text-white font-mono">{item.code}</span>
              <span className="text-gray-400 text-sm">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
