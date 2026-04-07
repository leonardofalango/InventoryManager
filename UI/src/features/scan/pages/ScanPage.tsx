import { useState, useEffect, useRef, useCallback } from "react";
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

import { useFeedbackStore } from "../../../store/feedbackStore";
import { api } from "../../../lib/axios";
import type { ActiveSession } from "../types/scan-types";

export function ScanPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const inputRef = useRef<HTMLInputElement>(null); // Ref para manter o foco

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
    const focusInput = () => {
      if (!isCameraOpen && !showManualInput) {
        inputRef.current?.focus();
      }
    };
    focusInput();
    const interval = setInterval(focusInput, 1000);
    return () => clearInterval(interval);
  }, [isCameraOpen, showManualInput]);

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
            }),
            success: false,
          },
          ...prev,
        ]);
        showFeedback(
          error.response?.data?.message || "Erro ao registrar",
          "error",
        );
      }
    },
    [activeSession, isLocationLocked, locationId, showFeedback],
  );

  const handleHiddenInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const val = (
      e.currentTarget.elements.namedItem("barcode") as HTMLInputElement
    ).value;
    processBarcode(val);
    (e.currentTarget.elements.namedItem("barcode") as HTMLInputElement).value =
      "";
  };

  if (isLoadingSession)
    return (
      <div className="text-white text-center mt-10 animate-pulse">
        Buscando inventário...
      </div>
    );

  if (!activeSession) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4">
        <PackageX size={48} className="text-gray-500" />
        <h2 className="text-xl font-bold text-white">Sessão Fechada</h2>
      </div>
    );
  }

  return (
    <div className="h-full max-h-screen flex flex-col bg-gray-900 overflow-hidden relative mt-4 rounded-lg">
      <form
        onSubmit={handleHiddenInput}
        className="absolute opacity-0 pointer-events-none"
      >
        <input
          ref={inputRef}
          name="barcode"
          type="text"
          autoComplete="off"
          inputMode="none"
        />
      </form>

      <div
        className={`p-3 flex items-center justify-between border-b ${isLocationLocked ? "bg-gray-800 border-accent" : "bg-yellow-600/20 border-yellow-500"}`}
      >
        <div className="flex items-center gap-2">
          <MapPin
            size={18}
            className={isLocationLocked ? "text-accent" : "text-yellow-500"}
          />
          <span className="text-white font-bold">
            {isLocationLocked ? locationName : "BIPE A LOCALIZAÇÃO"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManualInput(true)}
            className="p-2 bg-gray-700 rounded-lg text-gray-300"
          >
            <Keyboard size={16} />
          </button>
          <button
            onClick={() => setIsCameraOpen(true)}
            className="p-2 bg-gray-700 rounded-lg text-gray-300"
          >
            <Camera size={16} />
          </button>
          {isLocationLocked && (
            <button
              onClick={() => setIsLocationLocked(false)}
              className="px-2 py-1 bg-red-900/40 text-red-400 text-xs rounded border border-red-800"
            >
              Trocar
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {scannedItems.length === 0 ? (
          <div className="m-auto text-center text-gray-600 flex flex-col items-center gap-2">
            <ScanLine size={32} className="opacity-30" />
            <p className="text-xs uppercase tracking-tighter">
              Aguardando leitura...
            </p>
          </div>
        ) : (
          scannedItems.map((item) => (
            <div
              key={item.id}
              className={`p-2 rounded-lg flex items-center justify-between border ${item.success ? "bg-gray-800/50 border-gray-700" : "bg-red-900/20 border-red-800"}`}
            >
              <div className="flex items-center gap-2">
                {item.success ? (
                  <CheckCircle2 size={14} className="text-green-500" />
                ) : (
                  <AlertCircle size={14} className="text-red-500" />
                )}
                <span className="text-white font-mono font-bold">
                  {item.code}
                </span>
              </div>
              <span className="text-gray-500 text-[10px]">{item.time}</span>
            </div>
          ))
        )}
      </div>

      {showManualInput && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-4 rounded-xl w-full border border-gray-600">
            <div className="flex justify-between mb-4">
              <h3 className="text-white font-bold">Digitar Código</h3>
              <X
                onClick={() => setShowManualInput(false)}
                className="text-gray-400 cursor-pointer"
              />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processBarcode(manualInput);
                setManualInput("");
                setShowManualInput(false);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                autoFocus
                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-white"
              />
              <button
                type="submit"
                className="bg-accent px-4 rounded-lg text-white font-bold"
              >
                OK
              </button>
            </form>
          </div>
        </div>
      )}

      {isCameraOpen && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800">
            <span className="text-white font-bold text-sm">
              Leitura por Câmera
            </span>
            <button
              onClick={() => setIsCameraOpen(false)}
              className="bg-red-500 text-white p-1 rounded-full"
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
