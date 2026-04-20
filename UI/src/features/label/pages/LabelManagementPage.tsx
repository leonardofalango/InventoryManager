import { useState, useEffect } from "react";
import { Tag, Plus, Link as LinkIcon, Loader2 } from "lucide-react";
import { useFeedbackStore } from "../../../store/feedbackStore";
import { api } from "../../../lib/axios";

interface InventorySession {
  id: string;
  clientName: string;
}

interface Label {
  id: string;
  barcode: string;
  inventorySession: InventorySession;
}

export function LabelManagementPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);

  // const [generateCount, setGenerateCount] = useState(100);

  const [selectedSession, setSelectedSession] = useState("");
  const [startRange, setStartRange] = useState(1);
  const [endRange, setEndRange] = useState(100);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get("/InventorySession");
      setSessions(response.data);
    } catch (error) {
      showFeedback("Erro ao carregar inventários", "error");
    }
  };

  const fetchLabels = async () => {
    if (!selectedSession) {
      return showFeedback("Selecione um inventário", "error");
    }
    try {
      setLoadingLabels(true);
      const response = await api.get(
        `/ProductLocation/labels/${selectedSession}`,
      );
      setLabels(response.data);
      console.log(response.data);
    } catch (error) {
      showFeedback("Erro ao carregar etiquetas", "error");
    } finally {
      setLoadingLabels(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, [selectedSession]);

  // const handleCreateBatch = async () => {
  //   setLoading(true);
  //   try {
  //     await api.post(`/ProductLocation/create-locations/${generateCount}`);
  //     showFeedback(
  //       `${generateCount} etiquetas geradas com sucesso!`,
  //       "success",
  //     );
  //   } catch (error) {
  //     showFeedback("Erro ao gerar etiquetas", "error");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleCreateAndSetLocations = async () => {
    if (!selectedSession)
      return showFeedback("Selecione um inventário", "error");

    setLoading(true);
    try {
      await api.post(
        `/ProductLocation/create-and-set-locations/${selectedSession}`,
        {
          startCount: startRange,
          endCount: endRange,
        },
      );
      showFeedback("Etiquetas vinculadas ao inventário!", "success");
    } catch (error) {
      showFeedback("Erro ao vincular etiquetas.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 text-textPrimary">
        <Tag className="w-6 h-6 " /> Gestão de Etiquetas
      </h1>

      <div className="grid grid-cols-1 gap-6">
        {/* <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" /> Gerar Novas Etiquetas
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Gera etiquetas sequenciais no padrão INV0001, INV0002...
          </p>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Quantidade
            </label>
            <input
              type="number"
              value={generateCount}
              onChange={(e) => setGenerateCount(Number(e.target.value))}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleCreateBatch}
              disabled={loading}
              className="w-full bg-blue-600 text-textAccent py-2 rounded hover:bg-blue-700 flex justify-center items-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                "Gerar Etiquetas"
              )}
            </button>
          </div>
        </div> */}

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-textAccent">
            <LinkIcon className="w-5 h-5 text-green-600" /> Criar e Vincular ao
            Inventário
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textPrimary">
                Inventário
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full p-2 border rounded mt-1 bg-gray-700 border-gray-600 text-textAccent"
              >
                <option value="">Selecione um inventário...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.clientName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textPrimary">
                  De (Número)
                </label>
                <input
                  type="number"
                  value={startRange}
                  onChange={(e) => setStartRange(Number(e.target.value))}
                  className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-textAccent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textPrimary">
                  Até (Número)
                </label>
                <input
                  type="number"
                  value={endRange}
                  onChange={(e) => setEndRange(Number(e.target.value))}
                  className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-textAccent"
                />
              </div>
            </div>
            <button
              onClick={handleCreateAndSetLocations}
              disabled={loading || !selectedSession}
              className="w-full bg-accent text-textAccent font-semibold py-2 rounded hover:bg-accentHover flex justify-center items-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                "Vincular Etiquetas"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
