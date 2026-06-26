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
  Hash,
  Loader2,
  UploadCloud,
  WifiOff,
  Clock3,
} from "lucide-react";

import { useFeedbackStore } from "../../../store/feedbackStore";
import { api } from "../../../lib/axios";
import { getApiErrorMessage, isNetworkError } from "../../../lib/httpError";
import type { ActiveSession } from "../types/scan-types";
import {
  createOfflineCountId,
  enqueueOfflineCount,
  getNetworkConnected,
  readOfflineCounts,
  removeOfflineCounts,
  type OfflineInventoryCount,
  watchNetworkStatus,
} from "../services/offlineCountQueue";
import {
  getCachedActiveSession,
  getCachedLocation,
  saveCachedActiveSession,
  saveCachedLocation,
} from "../services/scanCache";

type ScannedItemStatus = "synced" | "queued" | "error";

interface ScannedItem {
  id: string;
  code: string;
  time: string;
  status: ScannedItemStatus;
  qty: number;
  message?: string;
}

const offlineBatchSize = 50;

const formatScanTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [scanQuantity, setScanQuantity] = useState<number>(1);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [tempQuantity, setTempQuantity] = useState<string>("");

  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const syncInProgressRef = useRef(false);

  const refreshOfflineQueueCount = useCallback(async () => {
    const queue = await readOfflineCounts();
    setOfflineQueueCount(queue.length);
  }, []);

  const addScannedItem = useCallback((item: ScannedItem) => {
    setScannedItems((prev) => [item, ...prev.slice(0, 49)]);
  }, []);

  const syncOfflineCounts = useCallback(
    async (silent = false) => {
      if (syncInProgressRef.current) return;

      const connected = await getNetworkConnected();
      setIsOnline(connected);

      if (!connected) {
        if (!silent) {
          showFeedback("Sem internet. As leituras continuam salvas no coletor.", "info");
        }
        return;
      }

      const queue = await readOfflineCounts();
      setOfflineQueueCount(queue.length);

      if (queue.length === 0) return;

      syncInProgressRef.current = true;
      setIsSyncingOffline(true);

      let syncedCount = 0;

      try {
        const bySession = queue.reduce(
          (acc, item) => {
            acc[item.inventorySessionId] = acc[item.inventorySessionId] ?? [];
            acc[item.inventorySessionId].push(item);
            return acc;
          },
          {} as Record<string, OfflineInventoryCount[]>,
        );

        for (const [sessionId, items] of Object.entries(bySession)) {
          for (let index = 0; index < items.length; index += offlineBatchSize) {
            const batch = items.slice(index, index + offlineBatchSize);
            const batchIds = batch.map((item) => item.localId);

            await api.post(`/inventorysession/${sessionId}/counts/batch`, {
              counts: batch.map((item) => ({
                ean: item.ean,
                productLocationId: item.productLocationId,
                quantity: item.quantity,
                countVersion: item.countVersion,
                countedAt: item.countedAt,
                clientCountId: item.localId,
              })),
            });

            await removeOfflineCounts(batchIds);
            syncedCount += batch.length;
            setOfflineQueueCount((current) =>
              Math.max(0, current - batch.length),
            );
          }
        }

        await refreshOfflineQueueCount();

        if (syncedCount > 0) {
          showFeedback(
            `${syncedCount} leitura${syncedCount > 1 ? "s" : ""} offline enviada${syncedCount > 1 ? "s" : ""}.`,
            "success",
          );
        }
      } catch (error) {
        if (isNetworkError(error)) {
          setIsOnline(false);
          if (!silent) {
            showFeedback(
              "A conexao caiu durante o envio. A fila offline foi mantida.",
              "info",
            );
          }
        } else {
          showFeedback(
            getApiErrorMessage(error, "Erro ao sincronizar leituras offline."),
            "error",
          );
        }
      } finally {
        syncInProgressRef.current = false;
        setIsSyncingOffline(false);
        await refreshOfflineQueueCount();
      }
    },
    [refreshOfflineQueueCount, showFeedback],
  );

  useEffect(() => {
    if (!isCameraOpen && !showManualInput && !showQuantityModal) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isCameraOpen, showManualInput, showQuantityModal]);

  useEffect(() => {
    const handleGlobalFocus = () => {
      if (!isCameraOpen && !showManualInput && !showQuantityModal) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener("click", handleGlobalFocus);
    return () => window.removeEventListener("click", handleGlobalFocus);
  }, [isCameraOpen, showManualInput, showQuantityModal]);

  useEffect(() => {
    refreshOfflineQueueCount();

    getNetworkConnected().then((connected) => {
      setIsOnline(connected);
      if (connected) {
        setSessionError(null);
        syncOfflineCounts(true);
      }
    });

    return watchNetworkStatus((connected) => {
      setIsOnline(connected);
      if (connected) {
        setSessionError(null);
        syncOfflineCounts(true);
      }
    });
  }, [refreshOfflineQueueCount, syncOfflineCounts]);

  const fetchActiveSession = useCallback(async () => {
    setIsLoadingSession(true);
    setSessionError(null);

    try {
      const response = await api.get("/inventorysession/active");
      setActiveSession(response.data);
      saveCachedActiveSession(response.data);
    } catch (error) {
      if (isNetworkError(error)) {
        const cachedSession = getCachedActiveSession();

        if (cachedSession) {
          setActiveSession(cachedSession);
          setSessionError(
            "Sem internet. Usando o ultimo inventario carregado neste coletor.",
          );
          showFeedback(
            "Sem internet. O coletor vai salvar as leituras para enviar depois.",
            "info",
          );
          return;
        }
      }

      setActiveSession(null);
      setSessionError(
        getApiErrorMessage(
          error,
          "Nao foi possivel buscar o inventario ativo.",
        ),
      );
    } finally {
      setIsLoadingSession(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    fetchActiveSession();
  }, [fetchActiveSession]);

  const processBarcode = useCallback(
    async (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode || !activeSession) return;

      if (isProcessingScan) {
        showFeedback("Aguarde a leitura atual terminar.", "info");
        return;
      }

      setIsProcessingScan(true);

      try {
        if (!isLocationLocked) {
          try {
            const location = await api.get(
              `/productlocation/${activeSession.id}/${cleanCode}`,
            );

            setLocationId(location.data.id);
            setLocationName(cleanCode);
            setIsLocationLocked(true);
            saveCachedLocation(activeSession.id, {
              id: location.data.id,
              barcode: cleanCode,
            });
            vibrate(100);
            showFeedback(`Localizacao ${cleanCode} confirmada`, "success");
          } catch (error) {
            if (isNetworkError(error)) {
              const cachedLocation = getCachedLocation(
                activeSession.id,
                cleanCode,
              );

              if (cachedLocation) {
                setLocationId(cachedLocation.id);
                setLocationName(cachedLocation.barcode);
                setIsLocationLocked(true);
                vibrate(100);
                showFeedback(
                  `Localizacao ${cachedLocation.barcode} carregada do cache offline.`,
                  "info",
                );
                return;
              }
            }

            vibrate([200, 100, 200]);
          }
          return;
        }

        if (!locationId) {
          showFeedback("Bipe a localizacao novamente antes de contar itens.", "error");
          return;
        }

        const qtyToSubmit = scanQuantity;
        const countedAt = new Date().toISOString();
        const clientCountId = createOfflineCountId();
        setScanQuantity(1);

        try {
          const response = await api.post(
            `/inventorysession/${activeSession.id}/count`,
            {
              ean: cleanCode,
              productLocationId: locationId,
              quantity: qtyToSubmit,
              countVersion: 1,
              countedAt,
              clientCountId,
            },
          );

          addScannedItem({
            id: response.data?.countId || clientCountId,
            code: cleanCode,
            time: formatScanTime(),
            status: "synced",
            qty: qtyToSubmit,
          });
          vibrate(80);
          showFeedback(
            `Lido: ${cleanCode} ${qtyToSubmit > 1 ? `(x${qtyToSubmit})` : ""}`,
            "success",
          );
        } catch (error) {
          if (isNetworkError(error)) {
            const queuedItem = await enqueueOfflineCount({
              localId: clientCountId,
              inventorySessionId: activeSession.id,
              ean: cleanCode,
              productLocationId: locationId,
              quantity: qtyToSubmit,
              countVersion: 1,
              countedAt,
            });

            addScannedItem({
              id: queuedItem.localId,
              code: cleanCode,
              time: formatScanTime(),
              status: "queued",
              qty: qtyToSubmit,
              message: "Salvo no coletor",
            });
            await refreshOfflineQueueCount();
            setIsOnline(false);
            vibrate(80);
            showFeedback(
              `Sem internet. Leitura ${cleanCode} salva para envio posterior.`,
              "info",
            );
            return;
          }

          const errorMessage = getApiErrorMessage(
            error,
            "Erro ao registrar leitura.",
          );

          addScannedItem({
            id: clientCountId,
            code: cleanCode,
            time: formatScanTime(),
            status: "error",
            qty: qtyToSubmit,
            message: errorMessage,
          });
          vibrate([300, 150, 300]);
          fetchActiveSession();
        }
      } finally {
        setIsProcessingScan(false);
      }
    },
    [
      activeSession,
      addScannedItem,
      fetchActiveSession,
      isLocationLocked,
      isProcessingScan,
      locationId,
      refreshOfflineQueueCount,
      scanQuantity,
      showFeedback,
    ],
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
          {sessionError || "Nenhum inventario ativo no momento."}
        </p>
        <button
          onClick={fetchActiveSession}
          disabled={isLoadingSession}
          className="mt-6 flex items-center justify-center gap-2 bg-accent hover:bg-accent/80 text-gray-900 font-bold uppercase py-3 px-6 rounded-xl transition-colors active:scale-95 shadow-lg disabled:opacity-60"
        >
          {isLoadingSession ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <RefreshCcw size={20} />
          )}
          {isLoadingSession ? "Verificando..." : "Verificar Novamente"}
        </button>
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

        {(sessionError || offlineQueueCount > 0 || !isOnline) && (
          <div className="bg-gray-950 border-b border-gray-800 px-4 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              {!isOnline ? (
                <WifiOff size={16} className="text-yellow-400 shrink-0" />
              ) : (
                <UploadCloud size={16} className="text-accent shrink-0" />
              )}
              <span>
                {!isOnline
                  ? "Sem internet. Leituras serao salvas no coletor."
                  : sessionError || "Fila offline pronta para envio."}
                {offlineQueueCount > 0 && (
                  <strong className="ml-1 text-textAccent">
                    {offlineQueueCount} pendente
                    {offlineQueueCount > 1 ? "s" : ""}
                  </strong>
                )}
              </span>
            </div>

            {offlineQueueCount > 0 && (
              <button
                type="button"
                onClick={() => syncOfflineCounts(false)}
                disabled={isSyncingOffline}
                className="self-start md:self-auto inline-flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold uppercase text-textAccent disabled:opacity-50"
              >
                {isSyncingOffline ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UploadCloud size={14} />
                )}
                {isSyncingOffline ? "Enviando..." : "Enviar fila"}
              </button>
            )}
          </div>
        )}

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
            {/* Botão de Quantidade Desktop */}
            {isLocationLocked && (
              <button
                onClick={() => {
                  setTempQuantity("");
                  setShowQuantityModal(true);
                }}
                className={`hidden md:flex items-center justify-center p-2 rounded-lg transition-colors ${
                  scanQuantity > 1
                    ? "bg-accent text-gray-900 font-bold"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }`}
                title="Informar Quantidade"
              >
                <Hash size={18} />
                {scanQuantity > 1 && (
                  <span className="ml-1 text-xs">x{scanQuantity}</span>
                )}
              </button>
            )}

            <button
              onClick={() => setShowManualInput(true)}
              disabled={isProcessingScan}
              className="hidden md:flex p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors disabled:opacity-50"
            >
              <Keyboard size={18} />
            </button>
            {isLocationLocked && (
              <button
                onClick={() => {
                  setIsLocationLocked(false);
                  setScannedItems([]);
                  setScanQuantity(1);
                }}
                disabled={isProcessingScan}
                className="flex items-center justify-center px-3 py-2 md:py-1.5 bg-gray-700/80 md:bg-red-900/40 active:bg-gray-600 md:hover:bg-red-900/60 rounded-lg md:rounded text-gray-200 md:text-red-400 border border-gray-600 md:border-red-800 shadow-sm transition-colors disabled:opacity-50"
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

      {/* Banner de alerta quando a quantidade é maior que 1 */}
      {scanQuantity > 1 && isLocationLocked && (
        <div className="bg-accent/20 border-b border-accent/50 text-accent px-4 py-2 flex items-center justify-between animate-pulse shadow-inner">
          <div className="flex items-center gap-2">
            <Hash size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">
              Próximo item: {scanQuantity} unidades
            </span>
          </div>
          <button
            onClick={() => setScanQuantity(1)}
            className="p-1.5 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
          >
            <X size={14} className="text-gray-300" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-2 bg-gray-900/50 md:bg-transparent pb-32">
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
                item.status === "synced"
                  ? index === 0
                    ? "bg-gray-800 border-accent/50 scale-[1.02] md:scale-100"
                    : "bg-gray-800/60 border-gray-700"
                  : item.status === "queued"
                    ? "bg-yellow-900/20 border-yellow-500/50"
                  : "bg-red-900/30 border-red-500/50"
              }`}
            >
              <div className="flex items-center gap-4 md:gap-3">
                {item.status === "synced" ? (
                  <CheckCircle2
                    size={24}
                    className={`md:w-5 md:h-5 ${index === 0 ? "text-accent" : "text-green-500"}`}
                  />
                ) : item.status === "queued" ? (
                  <Clock3
                    size={24}
                    className="text-yellow-400 md:w-5 md:h-5"
                  />
                ) : (
                  <AlertCircle
                    size={24}
                    className="text-red-500 md:w-5 md:h-5"
                  />
                )}
                <div className="flex flex-col">
                  <span
                    className={`font-mono text-xl md:text-base font-bold tracking-wider flex items-center gap-2 ${
                      item.status === "synced"
                        ? "text-textAccent"
                        : item.status === "queued"
                          ? "text-yellow-100"
                          : "text-red-100"
                    }`}
                  >
                    {item.code}
                    {item.qty > 1 && (
                      <span className="bg-accent text-gray-900 text-[10px] md:text-xs px-2 py-0.5 rounded-full font-black">
                        x{item.qty}
                      </span>
                    )}
                  </span>
                  {item.status !== "synced" && (
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        item.status === "queued"
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {item.message ||
                        (item.status === "queued"
                          ? "Aguardando envio"
                          : "Erro no registro")}
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

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-gray-800 border-t border-gray-700 p-4 flex gap-3 pb-6 z-30 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)]">
        <button
          onClick={() => {
            if (isLocationLocked) {
              setTempQuantity("");
              setShowQuantityModal(true);
            } else {
              showFeedback("Bipe a localizacao primeiro", "error");
            }
          }}
          disabled={isProcessingScan}
          className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl border transition-colors ${
            scanQuantity > 1
              ? "bg-accent text-gray-900 border-accent"
              : "bg-gray-700 text-textAccent border-gray-600 active:bg-gray-600 disabled:opacity-50"
          }`}
        >
          <Hash size={24} className="mb-1" />
          <span className="text-[10px] font-bold uppercase">
            {scanQuantity > 1 ? `Qtd: x${scanQuantity}` : "Quantidade"}
          </span>
        </button>
        <button
          onClick={() => setShowManualInput(true)}
          disabled={isProcessingScan}
          className="flex-1 flex flex-col items-center justify-center py-3 bg-gray-700 active:bg-gray-600 rounded-xl text-textAccent border border-gray-600 disabled:opacity-50"
        >
          <Keyboard size={24} className="mb-1" />
          <span className="text-[10px] font-bold uppercase">Digitar</span>
        </button>
        <button
          onClick={() => setIsCameraOpen(true)}
          disabled={isProcessingScan}
          className="flex-1 flex flex-col items-center justify-center py-3 bg-gray-700 active:bg-gray-600 rounded-xl text-textAccent border border-gray-600 disabled:opacity-50"
        >
          <Camera size={24} className="mb-1" />
          <span className="text-[10px] font-bold uppercase">Câmera</span>
        </button>
      </div>

      {/* Modal de Quantidade */}
      {showQuantityModal && (
        <div className="absolute inset-0 bg-black/90 md:bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
          <div className="bg-gray-800 rounded-t-3xl md:rounded-xl p-6 md:p-5 w-full md:max-w-sm border-t md:border border-gray-600 shadow-2xl pb-10 md:pb-5">
            <div className="flex justify-between items-center mb-6 md:mb-4">
              <h3 className="text-textAccent text-xl md:text-base font-bold flex items-center gap-2">
                <Hash className="text-accent" size={20} />
                Multiplicador
              </h3>
              <button
                onClick={() => setShowQuantityModal(false)}
                className="p-2 md:p-1 bg-gray-700 rounded-full text-gray-300"
              >
                <X size={24} className="md:w-5 md:h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const qty = parseInt(tempQuantity, 10);
                if (!isNaN(qty) && qty > 0) {
                  setScanQuantity(qty);
                } else {
                  setScanQuantity(1);
                }
                setTempQuantity("");
                setShowQuantityModal(false);
              }}
              className="flex flex-col gap-4"
            >
              <div className="text-center mb-2">
                <p className="text-gray-400 text-sm">
                  A quantidade informada será aplicada{" "}
                  <strong className="text-textAccent">
                    apenas na próxima leitura
                  </strong>
                  .
                </p>
              </div>
              <input
                type="number"
                min="1"
                step="1"
                value={tempQuantity}
                onChange={(e) => setTempQuantity(e.target.value)}
                autoFocus
                className="w-full bg-gray-900 border-2 md:border border-gray-600 rounded-xl md:rounded-lg py-4 md:py-2 px-6 md:px-3 text-3xl md:text-2xl text-center font-mono font-bold text-textAccent outline-none focus:border-accent"
                placeholder="Ex: 12"
              />
              <button
                type="submit"
                className="w-full bg-accent hover:bg-accent/80 py-4 md:py-3 rounded-xl md:rounded-lg text-gray-900 font-extrabold uppercase text-lg transition-colors"
              >
                Confirmar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Digitação Manual */}
      {showManualInput && (
        <div className="absolute inset-0 bg-black/90 md:bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-gray-800 rounded-t-3xl md:rounded-xl p-6 md:p-5 w-full md:max-w-sm border-t md:border border-gray-600 shadow-2xl pb-10 md:pb-5">
            <div className="flex justify-between items-center mb-6 md:mb-4">
              <h3 className="text-textAccent text-xl md:text-base font-bold">
                Entrada Manual
              </h3>
              <button
                onClick={() => setShowManualInput(false)}
                disabled={isProcessingScan}
                className="p-2 md:p-1 bg-gray-700 rounded-full text-gray-300 disabled:opacity-50"
              >
                <X size={24} className="md:w-5 md:h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await processBarcode(manualInput);
                setManualInput("");
                setShowManualInput(false);
              }}
              className="flex flex-col md:flex-row gap-4 md:gap-2"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                disabled={isProcessingScan}
                autoFocus
                className="w-full md:flex-1 bg-gray-900 border-2 md:border border-gray-600 rounded-xl md:rounded-lg py-4 md:py-2 px-6 md:px-3 text-xl md:text-base text-center md:text-left font-mono font-bold text-textAccent outline-none focus:border-accent disabled:opacity-60"
                placeholder="Código EAN"
              />
              <button
                type="submit"
                disabled={isProcessingScan || !manualInput.trim()}
                className="w-full md:w-auto bg-accent hover:bg-accent/80 py-4 md:py-2 md:px-6 rounded-xl md:rounded-lg text-gray-900 font-extrabold uppercase disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isProcessingScan ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "OK"
                )}
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
