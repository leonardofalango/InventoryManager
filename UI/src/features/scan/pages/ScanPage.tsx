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
  RefreshCcw,
  ClipboardList,
} from "lucide-react";

import { useFeedbackStore } from "../../../store/feedbackStore";
import { api } from "../../../lib/axios";
import type { ActiveSession } from "../types/scan-types";

const vibrate = (pattern: number | number[]) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export function ScanPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const inputRef = useRef<HTMLInputElement>(null);

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
          const location = await api.get(
            `/productlocation/${activeSession.id}/${cleanCode}`,
          );
          setLocationId(location.data.id);
          setLocationName(cleanCode);
          setIsLocationLocked(true);
          vibrate(100);
          showFeedback(`Localização ${cleanCode} confirmada`, "success");
        } catch (error: any) {
          vibrate([200, 100, 200]);
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
          ...prev.slice(0, 49),
        ]);
        vibrate(80);
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
        vibrate([300, 150, 300]);
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
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 text-textAccent">
        <RefreshCcw size={40} className="animate-spin text-accent mb-4" />
        <p className="text-lg font-bold">Buscando inventário...</p>
      </div>
    );

  if (!activeSession) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 p-6 text-center gap-4 md:rounded-xl md:mt-4 md:border md:border-gray-800">
        <PackageX size={64} className="text-gray-600 mb-2" />
        <h2 className="text-2xl md:text-xl font-bold text-gray-300">
          Sessão Fechada
        </h2>
        <p className="text-gray-500 text-sm md:text-base">
          Nenhum inventário ativo no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-6rem)] w-full flex flex-col bg-gray-900 overflow-hidden relative md:mt-4 md:max-w-4xl md:mx-auto md:rounded-xl md:border md:border-gray-800 md:shadow-2xl">
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

      <div className="z-10 shadow-lg">
        <div className="bg-green-400/70 border-b border-green-400 px-4 py-2 flex items-center gap-2">
          <ClipboardList size={14} className="text-green-900" />
          <span className="text-sm md:text-xs font-bold text-green-900 uppercase tracking-widest truncate">
            {activeSession.clientName}
          </span>
        </div>

        <div
          className={`px-4 py-4 md:py-3 flex items-center justify-between transition-colors ${
            isLocationLocked
              ? "bg-gray-800 border-b-2 md:border-b border-accent"
              : "bg-yellow-500 md:bg-yellow-600/20 md:border-b md:border-yellow-500 text-gray-900 md:text-textAccent"
          }`}
        >
          <div className="flex items-center gap-3 md:gap-2">
            <MapPin
              size={24}
              className={`md:w-5 md:h-5 ${isLocationLocked ? "text-accent" : "text-gray-900 md:text-yellow-500"}`}
            />
            <div className="flex flex-col md:flex-row md:items-center md:gap-2 leading-tight">
              <span
                className={`text-[10px] md:text-xs font-bold uppercase ${isLocationLocked ? "text-gray-400" : "text-gray-800 md:text-textAccent"}`}
              >
                {isLocationLocked ? "Localização:" : "Ação:"}
              </span>
              <span
                className={`text-lg md:text-base font-black tracking-wider ${isLocationLocked ? "text-textAccent" : "text-gray-900 md:text-textAccent"}`}
              >
                {isLocationLocked ? locationName : "BIPE A LOCALIZAÇÃO"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualInput(true)}
              className="hidden md:flex p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
            >
              <Keyboard size={18} />
            </button>
            {isLocationLocked && (
              <button
                onClick={() => {
                  setIsLocationLocked(false);
                  setScannedItems([]);
                }}
                className="flex items-center justify-center px-3 py-2 md:py-1.5 bg-gray-700/80 md:bg-red-900/40 active:bg-gray-600 md:hover:bg-red-900/60 rounded-lg md:rounded text-gray-200 md:text-red-400 border border-gray-600 md:border-red-800 shadow-sm transition-colors"
              >
                <RefreshCcw size={16} className="md:mr-1" />
                <span className="hidden md:inline text-xs font-bold uppercase">
                  Trocar Local
                </span>
                <span className="md:hidden text-[10px] font-bold uppercase ml-1">
                  Trocar
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-2 bg-gray-900/50 md:bg-transparent">
        {scannedItems.length === 0 ? (
          <div className="m-auto text-center flex flex-col items-center gap-4 opacity-40">
            <ScanLine size={64} className="text-gray-400 md:w-12 md:h-12" />
            <p className="text-lg md:text-base font-bold text-gray-400 uppercase tracking-widest">
              {isLocationLocked
                ? "Aguardando bip..."
                : "Aguardando Localização"}
            </p>
          </div>
        ) : (
          scannedItems.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 md:p-3 rounded-xl md:rounded-lg flex items-center justify-between border shadow-sm transition-all ${
                item.success
                  ? index === 0
                    ? "bg-gray-800 border-accent/50 scale-[1.02] md:scale-100"
                    : "bg-gray-800/60 border-gray-700"
                  : "bg-red-900/30 border-red-500/50"
              }`}
            >
              <div className="flex items-center gap-4 md:gap-3">
                {item.success ? (
                  <CheckCircle2
                    size={24}
                    className={`md:w-5 md:h-5 ${index === 0 ? "text-accent" : "text-green-500"}`}
                  />
                ) : (
                  <AlertCircle
                    size={24}
                    className="text-red-500 md:w-5 md:h-5"
                  />
                )}
                <div className="flex flex-col">
                  <span
                    className={`font-mono text-xl md:text-base font-bold tracking-wider ${item.success ? "text-textAccent" : "text-red-100"}`}
                  >
                    {item.code}
                  </span>
                  {!item.success && (
                    <span className="text-[10px] text-red-400 font-bold uppercase">
                      Erro no registro
                    </span>
                  )}
                </div>
              </div>
              <span className="text-gray-500 font-mono text-[10px] md:text-xs bg-gray-900 md:bg-gray-800/50 px-2 py-1 rounded-md">
                {item.time}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="md:hidden bg-gray-800 border-t border-gray-700 p-4 flex gap-4 pb-6 z-10">
        <button
          onClick={() => setShowManualInput(true)}
          className="flex-1 flex flex-col items-center justify-center py-3 bg-gray-700 active:bg-gray-600 rounded-xl text-textAccent border border-gray-600"
        >
          <Keyboard size={24} className="mb-1" />
          <span className="text-[10px] font-bold uppercase">Digitar</span>
        </button>
        <button
          onClick={() => setIsCameraOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-3 bg-gray-700 active:bg-gray-600 rounded-xl text-textAccent border border-gray-600"
        >
          <Camera size={24} className="mb-1" />
          <span className="text-[10px] font-bold uppercase">Câmera</span>
        </button>
      </div>

      {showManualInput && (
        <div className="absolute inset-0 bg-black/90 md:bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-gray-800 rounded-t-3xl md:rounded-xl p-6 md:p-5 w-full md:max-w-sm border-t md:border border-gray-600 shadow-2xl pb-10 md:pb-5">
            <div className="flex justify-between items-center mb-6 md:mb-4">
              <h3 className="text-textAccent text-xl md:text-base font-bold">
                Entrada Manual
              </h3>
              <button
                onClick={() => setShowManualInput(false)}
                className="p-2 md:p-1 bg-gray-700 rounded-full text-gray-300"
              >
                <X size={24} className="md:w-5 md:h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processBarcode(manualInput);
                setManualInput("");
                setShowManualInput(false);
              }}
              className="flex flex-col md:flex-row gap-4 md:gap-2"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                autoFocus
                className="w-full md:flex-1 bg-gray-900 border-2 md:border border-gray-600 rounded-xl md:rounded-lg py-4 md:py-2 px-6 md:px-3 text-xl md:text-base text-center md:text-left font-mono font-bold text-textAccent outline-none focus:border-accent"
                placeholder="Código EAN"
              />
              <button
                type="submit"
                className="w-full md:w-auto bg-accent hover:bg-accent/80 py-4 md:py-2 md:px-6 rounded-xl md:rounded-lg text-gray-900 font-extrabold uppercase"
              >
                OK
              </button>
            </form>
          </div>
        </div>
      )}

      {isCameraOpen && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col md:rounded-xl md:overflow-hidden">
          <div className="p-4 md:p-3 flex justify-between items-center bg-gray-900 border-b border-gray-800">
            <span className="text-textAccent font-bold text-lg md:text-base">
              Scanner
            </span>
            <button
              onClick={() => setIsCameraOpen(false)}
              className="bg-red-500/20 text-red-500 p-2 rounded-full border border-red-500/50"
            >
              <X size={28} className="md:w-5 md:h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-0 bg-black relative">
            <div id="reader" className="w-full h-full object-cover"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 md:w-1/2 h-32 md:h-24 border-2 border-accent/50 rounded-xl pointer-events-none">
              <div className="w-full h-[2px] bg-red-500 shadow-[0_0_10px_red] absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
