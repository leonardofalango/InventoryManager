import { useEffect, useMemo, useState } from "react";
import { ScanSearch, Search, Trash2, Loader2 } from "lucide-react";
import { api } from "../../../lib/axios";
import { useFeedbackStore } from "../../../store/feedbackStore";
import { SessionAutocomplete } from "../../../components/common/SessionAutoComplete";
import { ConfirmModal } from "../../../components/common/ConfirmModal";

interface EanLocationGroup {
  locationId: string;
  locationBarcode: string;
  ean: string;
  totalQuantity: number;
  readCount: number;
}

export function EanManagementPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedSessionName, setSelectedSessionName] = useState("");
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<EanLocationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    const fetchGroups = async () => {
      if (!selectedSession) {
        setGroups([]);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get(
          `/EanManagement/session/${selectedSession}`,
          {
            params: { search },
          },
        );
        setGroups(response.data);
      } catch {
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(fetchGroups, 350);
    return () => window.clearTimeout(timer);
  }, [selectedSession, search]);

  const groupedByLocation = useMemo(() => {
    return groups.reduce<Record<string, EanLocationGroup[]>>((acc, item) => {
      const key = item.locationId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [groups]);

  const confirmDeleteSingle = (group: EanLocationGroup) => {
    setConfirmConfig({
      isOpen: true,
      title: "Excluir leitura de EAN",
      message: `Deseja remover ${group.readCount} leitura(s) do EAN ${group.ean} na localidade ${group.locationBarcode}?`,
      isDanger: true,
      onConfirm: () => handleDeleteSingle(group),
    });
  };

  const confirmDeleteLocation = (
    locationId: string,
    locationBarcode: string,
  ) => {
    setConfirmConfig({
      isOpen: true,
      title: "Excluir todas as leituras da localidade",
      message: `Deseja remover todas as leituras da localidade ${locationBarcode}?`,
      isDanger: true,
      onConfirm: () => handleDeleteLocation(locationId),
    });
  };

  const handleDeleteSingle = async (group: EanLocationGroup) => {
    try {
      await api.delete(
        `/EanManagement/session/${selectedSession}/location/${group.locationId}/ean/${encodeURIComponent(group.ean)}`,
      );
      showFeedback("EAN removido da localidade.", "success");
      setGroups((prev) =>
        prev.filter(
          (item) =>
            !(item.locationId === group.locationId && item.ean === group.ean),
        ),
      );
    } catch {}
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      await api.delete(
        `/EanManagement/session/${selectedSession}/location/${locationId}`,
      );
      showFeedback(
        "Todas as leituras desta localidade foram removidas.",
        "success",
      );
      setGroups((prev) =>
        prev.filter((item) => item.locationId !== locationId),
      );
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
          <ScanSearch className="w-6 h-6" /> Gestão de EANs
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          Busque por EANs lidos e remova leituras por EAN ou pela localidade
          inteira, mantendo o histórico no banco.
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
        <label className="block text-sm font-medium text-textPrimary">
          Inventário
        </label>
        <SessionAutocomplete
          selectedId={selectedSession}
          selectedName={selectedSessionName}
          onSelect={(id, name) => {
            setSelectedSession(id);
            setSelectedSessionName(name);
          }}
        />

        {selectedSession && (
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por EAN ou localidade"
              className="w-full pl-10 pr-3 py-2 rounded bg-gray-700 border border-gray-600 text-textAccent focus:outline-none focus:border-accent"
            />
          </div>
        )}
      </div>

      {selectedSession && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : Object.keys(groupedByLocation).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhuma leitura encontrada.
            </div>
          ) : (
            Object.entries(groupedByLocation).map(([locationId, items]) => {
              const locationBarcode = items[0]?.locationBarcode || "Localidade";
              return (
                <div
                  key={locationId}
                  className="border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80">
                    <div>
                      <p className="font-semibold text-textAccent">
                        {locationBarcode}
                      </p>
                      <p className="text-xs text-gray-500">
                        {items.length} EAN(s) agrupado(s)
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        confirmDeleteLocation(locationId, locationBarcode)
                      }
                      className="text-red-400 hover:text-red-300 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Remover localidade
                    </button>
                  </div>
                  <div className="divide-y divide-gray-700">
                    {items.map((item) => (
                      <div
                        key={`${locationId}-${item.ean}`}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <p className="font-mono text-textAccent">
                            {item.ean}
                          </p>
                          <p className="text-xs text-gray-500">
                            Leituras: {item.readCount} · Quantidade:{" "}
                            {item.totalQuantity}
                          </p>
                        </div>
                        <button
                          onClick={() => confirmDeleteSingle(item)}
                          className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        confirmText="Excluir"
      />
    </div>
  );
}
