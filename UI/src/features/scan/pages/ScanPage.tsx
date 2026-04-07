import { useState, useEffect, useCallback } from "react";
import {
  Camera,
  MapPin,
  ScanLine,
  PackageX,
  X,
  Keyboard,
  CheckCircle2,
  AlertCircle,
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

  const [locationName, setLocationName] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);

  const [manualInput, setManualInput] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  const [scannedItems, setScannedItems] = useState<
    { id: string; code: string; time: string; success: boolean }[]
  >([]);

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

  const processBarcode = useCallback(
    async (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode || !activeSession) return;

      if (!isLocationLocked) {
        try {
          const location = await api.get(`/productlocation/${cleanCode}`);
          setLocationId(location.data.id);
          setLocationName(cleanCode);
          setIsLocationLocked(true);
          showFeedback(`Prateleira ${cleanCode} confirmada`, "success");
        } catch (error: any) {
          showFeedback("Localização inválida", "error");
        }
        return;
      }

      try {
        const response = await api.post(
          `/inventorysession/${activeSession.id}/count`,
          {
            ean: cleanCode,
            productLocationId: locationId,
            quantity: 1,
            countVersion: 1,
          },
        );

        setScannedItems((prev) => [
          {
            id: response.data?.countId || Math.random().toString(),
            code: cleanCode,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            success: true,
          },
          ...prev,
        ]);
        showFeedback(`Lido: ${cleanCode}`, "success");
      } catch (error: any) {
        setScannedItems((prev) => [
          {
            id: Math.random().toString(),
            code: cleanCode,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            success: false,
          },
          ...prev,
        ]);
        showFeedback(
          error.response?.data?.message || "Erro ao registrar produto",
          "error",
        );
      }
    },
    [activeSession, isLocationLocked, locationId, showFeedback],
  );

  useEffect(() => {
    if (!activeSession || isCameraOpen) return;

    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const currentTime = Date.now();

      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.length > 0) {
          e.preventDefault();
          processBarcode(barcodeBuffer);
          barcodeBuffer = "";
        }
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession, isCameraOpen, processBarcode]);

  useEffect(() => {
    if (!isCameraOpen) return;
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0] },
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
  }, [isCameraOpen, processBarcode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(manualInput);
    setManualInput("");
    setShowManualInput(false);
  };

  if (isLoadingSession)
    return (
      <div className="text-white text-center mt-10 p-4 font-semibold animate-pulse">
        Buscando inventário ativo...
      </div>
    );

  if (!activeSession) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="bg-gray-800 p-6 rounded-full border border-gray-700">
          <PackageX size={48} className="text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Sessão Fechada</h2>
        <p className="text-gray-400">
          Aguarde o gestor iniciar um novo inventário para começar a bipar.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full max-h-screen flex flex-col bg-gray-900 text-sm overflow-hidden relative">
      {/* CABEÇALHO - STATUS DA LOCALIZAÇÃO */}
      <div
        className={`p-4 flex flex-col gap-2 shadow-md z-10 transition-colors ${isLocationLocked ? "bg-gray-800 border-b-2 border-accent" : "bg-yellow-600/20 border-b border-yellow-500/50"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin
              size={20}
              className={isLocationLocked ? "text-accent" : "text-yellow-500"}
            />
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                {isLocationLocked ? "Prateleira Atual" : "Ação Necessária"}
              </p>
              <h2 className="text-white font-bold text-lg">
                {isLocationLocked ? locationName : "Bipe a Prateleira"}
              </h2>
            </div>
          </div>

          {isLocationLocked && (
            <button
              onClick={() => setIsLocationLocked(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              Trocar
            </button>
          )}
        </div>
      </div>

      {/* ÁREA CENTRAL - LISTA DE LEITURAS */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-gray-900">
        {scannedItems.length === 0 ? (
          <div className="m-auto text-center text-gray-500 flex flex-col items-center gap-3">
            <ScanLine size={40} className="opacity-50" />
            <p>
              Pronto para ler.
              <br />
              Aperte o gatilho do coletor.
            </p>
          </div>
        ) : (
          scannedItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl flex items-center justify-between border shadow-sm ${item.success ? "bg-gray-800 border-gray-700" : "bg-red-900/20 border-red-800/50"}`}
            >
              <div className="flex items-center gap-3">
                {item.success ? (
                  <CheckCircle2 size={18} className="text-green-400" />
                ) : (
                  <AlertCircle size={18} className="text-red-400" />
                )}
                <span className="text-white font-mono text-base font-semibold">
                  {item.code}
                </span>
              </div>
              <span className="text-gray-400 text-xs font-mono">
                {item.time}
              </span>
            </div>
          ))
        )}
      </div>

      {/* RODAPÉ - AÇÕES SECUNDÁRIAS */}
      <div className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2 z-10">
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          <Keyboard size={18} />
          <span className="text-xs uppercase">Digitar</span>
        </button>

        <button
          onClick={() => setIsCameraOpen(true)}
          className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-xl transition-colors"
        >
          <Camera size={18} />
        </button>
      </div>

      {/* MODAL DE DIGITAÇÃO MANUAL */}
      {showManualInput && (
        <div className="absolute inset-x-0 bottom-16 p-3 z-20 animate-in slide-in-from-bottom-2">
          <form
            onSubmit={handleManualSubmit}
            className="bg-gray-800 p-4 rounded-2xl border border-gray-600 shadow-2xl flex flex-col gap-3"
          >
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-white">
                Digitar Código
              </label>
              <button
                type="button"
                onClick={() => setShowManualInput(false)}
                className="text-gray-400 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                autoFocus
                placeholder="Ex: 789102030"
                className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg font-mono outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="bg-accent px-6 py-3 rounded-xl text-white font-bold"
              >
                OK
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DA CÂMERA */}
      {isCameraOpen && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800">
            <span className="text-white font-bold">Leitura por Câmera</span>
            <button
              onClick={() => setIsCameraOpen(false)}
              className="bg-red-500 text-white p-2 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 bg-white">
            <div
              id="reader"
              className="w-full max-w-sm rounded-xl overflow-hidden"
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
