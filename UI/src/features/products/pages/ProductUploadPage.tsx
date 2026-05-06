import { useEffect, useState, useCallback } from "react";
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
import { clsx } from "clsx";
import { api } from "../../../lib/axios";
import { useFeedbackStore } from "../../../store/feedbackStore";
import { SessionAutocomplete } from "../../../components/common/SessionAutoComplete";
import { PreviewTable } from "../components/PreviewTable";
import type { ProductCsvRow } from "../types/product-types";
import type { Product } from "../../../types";

export function ProductUploadPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();

  // Estados de Sessão
  const [sessionId, setSessionId] = useState<string | undefined>(
    routeSessionId,
  );
  const [clientName, setClientName] = useState("");
  const [isLoadingSession, setIsLoadingSession] = useState(!routeSessionId);

  // Estado de Visualização
  const [viewMode, setViewMode] = useState<"loading" | "upload" | "manage">(
    routeSessionId ? "manage" : "loading",
  );

  // Estados da Gestão (CRUD)
  const [products, setProducts] = useState<Product[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingManage, setLoadingManage] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ ean: "", name: "" });

  // Estados do Upload
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ProductCsvRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  // --- LÓGICA DE SESSÃO INICIAL ---
  useEffect(() => {
    if (!sessionId && !routeSessionId) {
      api
        .get("/inventorysession/active")
        .then((res) => {
          setClientName(res.data.clientName);
          setSessionId(res.data.id);
          setViewMode("manage");
        })
        .catch(() => {
          showFeedback(
            "Selecione um inventário para gerir os produtos.",
            "info",
          );
          setViewMode("upload");
        })
        .finally(() => setIsLoadingSession(false));
    } else {
      setIsLoadingSession(false);
    }
  }, [routeSessionId, sessionId, showFeedback]);

  // --- LÓGICA DE GESTÃO (CRUD) ---
  const fetchProducts = useCallback(async () => {
    if (!sessionId || viewMode !== "manage") return;
    setLoadingManage(true);
    try {
      const response = await api.get("/Products", {
        params: {
          inventorySessionId: sessionId,
          page,
          search,
          pageSize,
        },
      });
      setProducts(response.data.data);
      setTotalItems(response.data.totalItems || response.data.data.length);
      setTotalPages(response.data.totalPages);

      if (
        (response.data.totalItems === 0 || response.data.data.length === 0) &&
        !search
      ) {
        setViewMode("upload");
      }
    } catch (error) {
      showFeedback("Erro ao carregar produtos", "error");
    } finally {
      setLoadingManage(false);
    }
  }, [sessionId, page, search, viewMode, showFeedback]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 500);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleSaveItem = async () => {
    try {
      if (editingItem) {
        await api.put(`/Products/${editingItem.id}`, formData);
        showFeedback("Produto atualizado.", "success");
      } else {
        await api.post(`/Products/${sessionId}`, formData);
        showFeedback("Produto adicionado.", "success");
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error: any) {
      showFeedback(
        error.response?.data?.message || "Erro ao salvar produto.",
        "error",
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este produto?")) return;
    try {
      await api.delete(`/Products/${id}`);
      showFeedback("Produto removido com sucesso", "success");
      fetchProducts();
    } catch (error) {
      showFeedback("Erro ao remover produto", "error");
    }
  };

  const openModal = (item?: Product) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ean: item.ean, name: item.name });
    } else {
      setEditingItem(null);
      setFormData({ ean: "", name: "" });
    }
    setIsModalOpen(true);
  };

  // --- LÓGICA DE UPLOAD ---
  const handleFile = (selectedFile: File) => {
    if (
      selectedFile?.type.includes("csv") ||
      selectedFile?.name.endsWith(".csv")
    ) {
      setFile(selectedFile);
      setUploadStatus("idle");
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => setPreviewData(results.data as ProductCsvRow[]),
        error: () => setUploadStatus("error"),
      });
    } else {
      showFeedback("Por favor, selecione um arquivo .CSV válido.", "error");
    }
  };

  const handleUpload = async () => {
    if (!file || previewData.length === 0 || !sessionId) return;
    setIsUploading(true);
    try {
      await api.post(`/Import/products/${sessionId}`, previewData);
      setUploadStatus("success");
      showFeedback("Importação concluída!", "success");

      setTimeout(() => {
        setSearch("");
        setPage(1);
        setFile(null);
        setUploadStatus("idle");
        fetchProducts();
        setViewMode("manage");
      }, 1500);
    } catch (error) {
      setUploadStatus("error");
      showFeedback("Erro na importação", "error");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8 space-y-2">
        <label className="block text-sm font-medium text-textPrimary">
          Inventário de Trabalho
        </label>
        <SessionAutocomplete
          selectedId={sessionId || ""}
          selectedName={clientName}
          onSelect={(id, name) => {
            setSessionId(id);
            setClientName(name);
            setPage(1);
            setViewMode("manage");
          }}
        />
      </div>

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary text-white">
            Produtos
          </h1>
          <p className="text-textSecondary">
            Gerencie o catálogo ou importe via CSV.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("manage")}
            className={`px-4 py-2 rounded-lg transition-colors border ${
              viewMode === "manage"
                ? "bg-accent text-textAccent border-accent"
                : "bg-gray-800 text-gray-300 border-gray-600"
            }`}
          >
            Gerenciar Produtos
          </button>
          <button
            onClick={() => setViewMode("upload")}
            className={`px-4 py-2 rounded-lg transition-colors border ${
              viewMode === "upload"
                ? "bg-accent text-textAccent border-accent"
                : "bg-gray-800 text-gray-300 border-gray-600"
            }`}
          >
            Importar CSV
          </button>
        </div>
      </div>

      {sessionId && viewMode === "manage" && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => openModal()}
            className="bg-accent text-textAccent px-4 py-2 rounded-lg font-medium hover:bg-accent/90 flex items-center gap-2"
          >
            <Plus size={20} /> Adicionar Manualmente
          </button>
        </div>
      )}

      {!sessionId ? (
        <div className="text-center py-20 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
          <p className="text-textSecondary">
            Selecione um inventário acima para começar.
          </p>
        </div>
      ) : viewMode === "upload" ? (
        <div className="flex flex-col gap-6 animate-fade-in w-full">
          <div
            className={clsx(
              "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 w-full",
              dragActive
                ? "border-accent bg-blue-50/10"
                : "border-gray-600 bg-gray-800/50 hover:border-gray-500",
              uploadStatus === "success" && "border-green-500 bg-green-500/10",
            )}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.[0])
                handleFile(e.dataTransfer.files[0]);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
              accept=".csv"
              disabled={isUploading}
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
                  <h3 className="text-lg font-medium text-textAccent">
                    {file.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpload();
                    }}
                    disabled={isUploading}
                    className="mt-4 z-50 pointer-events-auto bg-accent text-textAccent px-6 py-2 rounded-lg font-medium hover:bg-accent/90 flex items-center gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <UploadCloud size={20} />
                    )}{" "}
                    Confirmar Importação de {previewData.length} produtos
                  </button>
                </>
              ) : (
                <>
                  <UploadCloud className="w-16 h-16 text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-textAccent">
                    Arraste o arquivo CSV de produtos aqui
                  </h3>
                  <p className="text-sm text-textSecondary mt-1">
                    O arquivo deve conter as colunas EAN e Nome correspondentes
                  </p>
                </>
              )}
            </div>
          </div>

          {previewData.length > 0 && uploadStatus !== "success" && (
            <div className="w-full">
              <PreviewTable data={previewData} preview={5} />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-gray-700 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por EAN ou Nome do Produto..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-textAccent focus:ring-2 focus:ring-accent outline-none"
              />
            </div>
          </div>

          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/50 text-textSecondary uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">EAN</th>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loadingManage ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center">
                    <Loader2 className="animate-spin w-6 h-6 mx-auto text-accent" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-10 text-center text-textSecondary"
                  >
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono">{p.ean}</td>
                    <td className="px-6 py-4">{p.name}</td>
                    <td className="px-6 py-4 flex justify-end gap-3">
                      <button
                        onClick={() => openModal(p)}
                        className="p-2 text-textSecondary hover:text-blue-400 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-textSecondary hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="p-4 border-t border-gray-700 flex items-center justify-between text-sm text-textSecondary">
            <span>
              Página {page} de {totalPages || 1} - {totalItems} item(s)
              encontrado(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-textAccent">
                {editingItem ? "Editar Produto" : "Novo Produto"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-textSecondary hover:text-textAccent transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Código EAN
                </label>
                <input
                  type="text"
                  value={formData.ean}
                  onChange={(e) =>
                    setFormData({ ...formData, ean: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-textAccent focus:border-accent outline-none"
                  placeholder="Ex: 7891234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Nome do Produto
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-textAccent focus:border-accent outline-none"
                  placeholder="Nome descritivo..."
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItem}
                disabled={!formData.ean || !formData.name}
                className="px-4 py-2 bg-accent text-textAccent font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
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
