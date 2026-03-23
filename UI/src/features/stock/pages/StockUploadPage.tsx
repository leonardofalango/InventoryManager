import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import Papa from "papaparse";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import type { ExpectedStockItem, StockCsvRow } from "../types/stock-types";
import { clsx } from "clsx";
import { api } from "../../../lib/axios";
import { useFeedbackStore } from "../../../store/feedbackStore";

export function StockUploadPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const [clientName, setClientName] = useState("Carregando...");

  const [sessionId, setSessionId] = useState<string | undefined>(
    routeSessionId,
  );
  const [isLoadingSession, setIsLoadingSession] = useState(!routeSessionId);
  const [viewMode, setViewMode] = useState<"loading" | "upload" | "manage">(
    "loading",
  );

  const [stockItems, setStockItems] = useState<ExpectedStockItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 10;

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<StockCsvRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpectedStockItem | null>(
    null,
  );
  const [formData, setFormData] = useState({ newEan: "", expectedQuantity: 0 });

  useEffect(() => {
    if (!routeSessionId) {
      api
        .get("/inventorysession/active")
        .then((res) => {
          setClientName(res.data.clientName);
          setSessionId(res.data.id);
          console.log("Sessão ativa encontrada:", clientName);
        })
        .catch(() =>
          showFeedback("Nenhum inventário ativo encontrado.", "error"),
        )
        .finally(() => setIsLoadingSession(false));
    }
  }, [routeSessionId, showFeedback]);

  const fetchStock = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(
        `/stock/${sessionId}?page=${page}&pageSize=${pageSize}&search=${search}`,
      );
      setStockItems(res.data.data);
      setTotalItems(res.data.totalItems);
      setTotalPages(res.data.totalPages);

      if (res.data.totalItems === 0 && !search) {
        setViewMode("upload");
      } else {
        setViewMode("manage");
      }
    } catch (error) {
      console.error(error);
      showFeedback("Erro ao buscar estoque.", "error");
    }
  }, [sessionId, page, search, showFeedback]);

  useEffect(() => {
    if (sessionId) fetchStock();
  }, [fetchStock, sessionId]);

  const handleFile = (selectedFile: File) => {
    if (
      selectedFile?.name.endsWith(".csv") ||
      selectedFile?.type.includes("csv")
    ) {
      setFile(selectedFile);
      setUploadStatus("idle");
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        preview: 5,
        complete: (results) => setPreviewData(results.data as StockCsvRow[]),
        error: () => setUploadStatus("error"),
      });
    } else {
      showFeedback("Selecione um arquivo .CSV válido.", "error");
    }
  };

  const handleUpload = async () => {
    if (!file || previewData.length === 0 || !sessionId) return;
    setIsUploading(true);

    try {
      const payload = previewData
        .map((row: any) => ({
          ean: String(row.ean || row.EAN || row.Ean || row.codigo || ""),
          expectedQuantity: Number(
            row.expectedQuantity ||
              row.ExpectedQuantity ||
              row.quantidade ||
              row.qtd ||
              0,
          ),
        }))
        .filter((item) => item.ean.trim() !== "");

      const response = await api.post(
        `/import/expected-stock/${sessionId}`,
        payload,
      );

      setUploadStatus("success");
      showFeedback(
        response.data.message || "Estoque importado com sucesso!",
        "success",
      );

      setTimeout(() => {
        setSearch("");
        setPage(1);
        fetchStock();
      }, 1500);
    } catch (error) {
      console.error(error);
      setUploadStatus("error");
      showFeedback("Erro ao importar estoque.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveItem = async () => {
    try {
      const payload = {
        newEan: formData.newEan,
        expectedQuantity: Number(formData.expectedQuantity),
      };

      if (editingItem) {
        await api.put(`/stock/${editingItem.id}`, payload);
        showFeedback("Item atualizado.", "success");
      } else {
        await api.post(`/stock/${sessionId}`, payload);
        showFeedback("Item adicionado.", "success");
      }
      setIsModalOpen(false);
      fetchStock();
    } catch (error: any) {
      showFeedback(
        error.response?.data?.message || "Erro ao salvar item.",
        "error",
      );
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (
      confirm("Tem certeza que deseja remover este item do estoque esperado?")
    ) {
      try {
        await api.delete(`/stock/${id}`);
        showFeedback("Item removido.", "success");
        fetchStock();
      } catch (error) {
        showFeedback("Erro ao remover item.", "error");
      }
    }
  };

  const openModal = (item?: ExpectedStockItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        newEan: item.ean,
        expectedQuantity: item.expectedQuantity,
      });
    } else {
      setEditingItem(null);
      setFormData({ newEan: "", expectedQuantity: 0 });
    }
    setIsModalOpen(true);
  };

  if (isLoadingSession || viewMode === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-3">
        <span className="text-gray-400 text-sm">Inventário Ativo:</span>
        <span className="text-green-400 font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          {clientName}
        </span>
      </div> */}
      <div className="mb-8 flex justify-between items-end">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              Gerenciamento de Equipe
            </h1>
            <p className="text-gray-400">
              Gerencie times e prestadores de serviço
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("manage")}
              className={`px-4 py-2 rounded-lg transition-colors border ${viewMode === "manage" ? "bg-accent text-white border-accent" : "bg-gray-800 text-gray-300 border-gray-600"}`}
            >
              Gerenciar Estoque
            </button>
            <button
              onClick={() => setViewMode("upload")}
              className={`px-4 py-2 rounded-lg transition-colors border ${viewMode === "upload" ? "bg-accent text-white border-accent" : "bg-gray-800 text-gray-300 border-gray-600"}`}
            >
              Upload
            </button>
          </div>
        </div>

        {viewMode === "manage" && (
          <button
            onClick={() => openModal()}
            className="bg-accent text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-accent/90 flex items-center gap-2"
          >
            <Plus size={20} /> Adicionar Manualmente
          </button>
        )}
      </div>

      {viewMode === "upload" ? (
        <div
          className={clsx(
            "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200",
            dragActive
              ? "border-accent bg-blue-50/10"
              : "border-gray-600 bg-gray-800/50 hover:border-gray-500",
            uploadStatus === "success" && "border-green-500 bg-green-500/10",
          )}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
            accept=".csv"
            disabled={isUploading || !sessionId}
          />
          <div className="flex flex-col items-center justify-center pointer-events-none">
            {uploadStatus === "success" ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-green-700">
                  Importação Concluída!
                </h3>
              </>
            ) : file ? (
              <>
                <FileSpreadsheet className="w-16 h-16 text-accent mb-4" />
                <h3 className="text-lg font-medium text-white">{file.name}</h3>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleUpload();
                  }}
                  disabled={isUploading || !sessionId}
                  className="mt-4 z-50 pointer-events-auto bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <UploadCloud size={20} />
                  )}{" "}
                  Confirmar Importação
                </button>
              </>
            ) : (
              <>
                <UploadCloud className="w-16 h-16 text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-white">
                  Arraste seu arquivo CSV aqui
                </h3>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por EAN ou Nome do Produto..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">EAN</th>
                <th className="px-6 py-4 font-medium">Produto</th>
                <th className="px-6 py-4 font-medium">Qtd Esperada</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {stockItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-700/20 transition-colors"
                >
                  <td className="px-6 py-4 font-mono">{item.ean}</td>
                  <td className="px-6 py-4">{item.productName}</td>
                  <td className="px-6 py-4 font-medium text-accent">
                    {item.expectedQuantity}
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-3">
                    <button
                      onClick={() => openModal(item)}
                      className="p-2 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-gray-700/50 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-700/50 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação */}
          <div className="p-4 border-t border-gray-700 flex items-center justify-between text-sm text-gray-400">
            <span>
              Mostrando página {page} de {totalPages || 1}
            </span>
            <span>Total de itens: {totalItems}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">
                {editingItem ? "Editar Estoque" : "Novo Item de Estoque"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Código EAN
                </label>
                <input
                  type="text"
                  value={formData.newEan}
                  onChange={(e) =>
                    setFormData({ ...formData, newEan: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  placeholder="Ex: 7891010101010"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Quantidade Esperada
                </label>
                <input
                  type="number"
                  value={formData.expectedQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expectedQuantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItem}
                className="px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
