import { useEffect, useState, useCallback } from "react";
import Papa from "papaparse";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  List,
  Upload,
} from "lucide-react";
import { clsx } from "clsx";
import { api } from "../../../lib/axios";
import { useFeedbackStore } from "../../../store/feedbackStore";
import { SessionAutocomplete } from "../../../components/common/SessionAutoComplete";
import { PreviewTable } from "../components/PreviewTable";
import type { ProductCsvRow } from "../types/product-types";
import type { Product } from "../../../types";

type Tab = "upload" | "manage";

export function ProductUploadPage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedSessionName, setSelectedSessionName] = useState<string>("");

  // Estados do Upload
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ProductCsvRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  // Estados da Gestão (CRUD)
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingManage, setLoadingManage] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const showFeedback = useFeedbackStore((state) => state.showFeedback);

  // --- LÓGICA DE GESTÃO (CRUD) ---
  const fetchProducts = useCallback(async () => {
    if (!selectedSessionId || activeTab !== "manage") return;
    setLoadingManage(true);
    try {
      const response = await api.get("/Products", {
        params: {
          inventorySessionId: selectedSessionId,
          page,
          search,
          pageSize: 10,
        },
      });
      setProducts(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      showFeedback("Erro ao carregar produtos", "error");
    } finally {
      setLoadingManage(false);
    }
  }, [selectedSessionId, page, search, activeTab, showFeedback]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 500);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

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

  // --- LÓGICA DE UPLOAD ---
  const handleFile = (selectedFile: File) => {
    if (
      selectedFile?.type.includes("csv") ||
      selectedFile.name.endsWith(".csv")
    ) {
      setFile(selectedFile);
      setUploadStatus("idle");
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        preview: 5,
        complete: (results) => setPreviewData(results.data as ProductCsvRow[]),
      });
    } else {
      showFeedback("Por favor, selecione um arquivo .CSV válido.", "error");
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedSessionId) return;
    setIsUploading(true);
    try {
      // Rota corrigida conforme o ImportController
      await api.post(`/Import/products/${selectedSessionId}`, previewData);
      setUploadStatus("success");
      showFeedback("Importação concluída!", "success");
      setTimeout(() => {
        setFile(null);
        setUploadStatus("idle");
      }, 2000);
    } catch (error) {
      setUploadStatus("error");
      showFeedback("Erro na importação", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-textPrimary text-white">
          Produtos
        </h1>
        <p className="text-textSecondary">
          Gerencie o catálogo ou importe via CSV.
        </p>
      </div>

      {/* Seletor de Sessão (Fixado no topo) */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
        <label className="block text-sm font-medium text-textPrimary mb-2">
          Inventário de Trabalho
        </label>
        <SessionAutocomplete
          selectedId={selectedSessionId}
          selectedName={selectedSessionName}
          onSelect={(id, name) => {
            setSelectedSessionId(id);
            setSelectedSessionName(name);
            setPage(1);
          }}
        />
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-gray-700 mb-6 gap-4">
        <button
          onClick={() => setActiveTab("upload")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2",
            activeTab === "upload"
              ? "border-accent text-accent"
              : "border-transparent text-textSecondary hover:text-textPrimary",
          )}
        >
          <Upload size={18} /> Importar CSV
        </button>
        <button
          onClick={() => setActiveTab("manage")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2",
            activeTab === "manage"
              ? "border-accent text-accent"
              : "border-transparent text-textSecondary hover:text-textPrimary",
          )}
        >
          <List size={18} /> Gerenciar Produtos
        </button>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === "upload" ? (
        <div className="space-y-6">
          <div
            className={clsx(
              "relative border-2 border-dashed rounded-xl p-12 text-center transition-all",
              dragActive
                ? "border-accent bg-red-50/10"
                : "border-gray-600 bg-gray-800/50",
              uploadStatus === "success" && "border-green-500 bg-green-500/10",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              accept=".csv"
            />
            <div className="flex flex-col items-center justify-center">
              {uploadStatus === "success" ? (
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              ) : file ? (
                <>
                  <FileSpreadsheet className="w-16 h-16 text-accent mb-4" />
                  <p className="text-textAccent font-medium mb-4">
                    {file.name}
                  </p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpload();
                    }}
                    className="z-50 bg-accent hover:bg-accentHover text-white px-6 py-2 rounded-lg flex items-center gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <UploadCloud size={20} />
                    )}
                    {isUploading ? "Processando..." : "Confirmar Envio"}
                  </button>
                </>
              ) : (
                <>
                  <UploadCloud className="w-16 h-16 text-gray-500 mb-4" />
                  <p className="text-textAccent">
                    Arraste o CSV ou clique para selecionar
                  </p>
                </>
              )}
            </div>
          </div>
          {file && <PreviewTable data={previewData} preview={5} />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar por EAN ou Nome..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-textPrimary focus:border-accent outline-none"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-900 text-textSecondary text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">EAN</th>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loadingManage ? (
                  <tr>
                    <td colSpan={3} className="py-10 text-center">
                      <Loader2 className="animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-700/30">
                      <td className="px-6 py-4 font-mono text-sm text-textPrimary">
                        {p.ean}
                      </td>
                      <td className="px-6 py-4 text-textPrimary">{p.name}</td>
                      <td className="px-6 py-4 flex justify-center gap-3">
                        <button className="text-blue-400 hover:text-blue-300">
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-accent hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="p-4 bg-gray-900 flex justify-between items-center border-t border-gray-700">
              <span className="text-sm text-textSecondary">
                Pág. {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 hover:bg-gray-700 rounded-md disabled:opacity-30"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 hover:bg-gray-700 rounded-md disabled:opacity-30"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
