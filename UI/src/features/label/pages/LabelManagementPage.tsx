import { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Link as LinkIcon,
  Loader2,
  Trash2,
  List,
} from "lucide-react";
import { useFeedbackStore } from "../../../store/feedbackStore";
import { api } from "../../../lib/axios";
import { SessionAutocomplete } from "../../../components/common/SessionAutoComplete";

interface Label {
  id: string;
  barcode: string;
  inventorySessionId: string;
}

export function LabelManagementPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const [loading, setLoading] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);

  // Estados para o novo Autocomplete
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedSessionName, setSelectedSessionName] = useState("");

  const [startRange, setStartRange] = useState(1);
  const [endRange, setEndRange] = useState(100);
  const [newBarcode, setNewBarcode] = useState("");
  const [activeTab, setActiveTab] = useState<"bulk" | "manage">("bulk");

  // Busca etiquetas sempre que a sessão selecionada mudar
  useEffect(() => {
    const fetchLabels = async () => {
      if (!selectedSession) {
        setLabels([]);
        return;
      }
      try {
        setLoadingLabels(true);
        const response = await api.get(
          `/ProductLocation/labels/${selectedSession}`,
        );
        setLabels(response.data);
      } catch (error) {
        showFeedback("Erro ao carregar etiquetas", "error");
      } finally {
        setLoadingLabels(false);
      }
    };

    fetchLabels();
  }, [selectedSession, showFeedback]);

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
      // Forçar recarregamento das etiquetas
      const response = await api.get(
        `/ProductLocation/labels/${selectedSession}`,
      );
      setLabels(response.data);
    } catch (error) {
      showFeedback("Erro ao vincular etiquetas.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSingleLabel = async () => {
    if (!selectedSession)
      return showFeedback("Selecione um inventário", "error");
    if (!newBarcode.trim())
      return showFeedback("Informe o código de barras", "error");

    setLoading(true);
    try {
      await api.post(`/ProductLocation`, {
        barcode: newBarcode.trim(),
        inventorySessionId: selectedSession,
      });
      showFeedback("Etiqueta adicionada com sucesso!", "success");
      setNewBarcode("");
      const response = await api.get(
        `/ProductLocation/labels/${selectedSession}`,
      );
      setLabels(response.data);
    } catch (error) {
      showFeedback("Erro ao adicionar etiqueta.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLabel = async (id: string) => {
    if (!window.confirm("Deseja realmente remover esta etiqueta?")) return;

    try {
      await api.delete(`/ProductLocation/${id}`);
      showFeedback("Etiqueta removida!", "success");
      setLabels(labels.filter((l) => l.id !== id));
    } catch (error) {
      showFeedback("Erro ao remover etiqueta.", "error");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 text-textPrimary">
        <Tag className="w-6 h-6 " /> Gestão de Etiquetas
      </h1>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <label className="block text-sm font-medium text-textPrimary mb-2">
          Inventário de Destino
        </label>
        {/* Substituição do antigo <select> pelo Autocomplete */}
        <SessionAutocomplete
          selectedId={selectedSession}
          selectedName={selectedSessionName}
          onSelect={(id, name) => {
            setSelectedSession(id);
            setSelectedSessionName(name);
          }}
        />
      </div>

      {selectedSession && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden animate-fade-in">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab("bulk")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                activeTab === "bulk"
                  ? "bg-gray-700 text-accent border-b-2 border-accent"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              Vincular em Massa
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                activeTab === "manage"
                  ? "bg-gray-700 text-accent border-b-2 border-accent"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
              }`}
            >
              <List className="w-4 h-4" />
              Gerenciar Etiquetas
            </button>
          </div>

          <div className="p-6">
            {activeTab === "bulk" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textPrimary">
                      De (Número)
                    </label>
                    <input
                      type="number"
                      value={startRange}
                      onChange={(e) => setStartRange(Number(e.target.value))}
                      className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-textAccent mt-1 focus:ring-1 focus:ring-accent outline-none"
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
                      className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-textAccent mt-1 focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateAndSetLocations}
                  disabled={loading}
                  className="w-full bg-accent text-textAccent font-semibold py-2 rounded hover:bg-accent/80 flex justify-center items-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    "Vincular Etiquetas em Lote"
                  )}
                </button>
              </div>
            )}

            {activeTab === "manage" && (
              <div className="space-y-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: INV0001"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="flex-1 p-2 border rounded bg-gray-700 border-gray-600 text-textAccent focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={handleAddSingleLabel}
                    disabled={loading || !newBarcode.trim()}
                    className="bg-accent text-textAccent px-4 py-2 rounded hover:bg-accent/80 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                    Adicionar
                  </button>
                </div>

                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900 text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          Código de Barras
                        </th>
                        <th className="px-4 py-3 font-medium w-24 text-center">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {loadingLabels ? (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : labels.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            Nenhuma etiqueta vinculada a este inventário.
                          </td>
                        </tr>
                      ) : (
                        labels.map((label) => (
                          <tr key={label.id} className="hover:bg-gray-700/50">
                            <td className="px-4 py-3 font-medium text-textAccent font-mono">
                              {label.barcode}
                            </td>
                            <td className="px-4 py-3 flex justify-center">
                              <button
                                onClick={() => handleDeleteLabel(label.id)}
                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                                title="Remover Etiqueta"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="text-sm text-gray-500 text-right">
                  Total de etiquetas: <strong>{labels.length}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
