import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Papa from "papaparse";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { PreviewTable } from "../../products/components/PreviewTable";
import type { StockCsvRow } from "../types/stock-types";
import { clsx } from "clsx";
import { api } from "../../../lib/axios";

export function StockUploadPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<StockCsvRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

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
        complete: (results) => {
          setPreviewData(results.data as StockCsvRow[]);
        },
        error: (error) => {
          console.error(error);
          setUploadStatus("error");
        },
      });
    } else {
      alert("Por favor, selecione um arquivo .CSV válido.");
    }
  };

  const handleUpload = async () => {
    if (!file || previewData.length === 0 || !sessionId) return;
    setIsUploading(true);

    try {
      await api.post(`/import/expected-stock/${sessionId}`, previewData);
      setUploadStatus("success");

      setTimeout(() => {
        navigate(`/inventory/${sessionId}`);
      }, 2000);
    } catch (error) {
      console.error("Erro ao importar estoque esperado:", error);
      setUploadStatus("error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-300">
          Importar estoque esperado
        </h1>
        <p className="text-gray-400">
          Carregue o arquivo do cliente para comparar com a contagem física.
        </p>
      </div>

      <div
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-all",
          dragActive
            ? "border-accent bg-blue-50/10"
            : "border-gray-600 bg-gray-800/50 hover:border-gray-500",
          uploadStatus === "success" && "border-green-500 bg-green-500/10",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          accept=".csv"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center pointer-events-none">
          {uploadStatus === "success" ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-green-500">
                Stock Importado!
              </h3>
              <p className="text-gray-400">Redirecionando para a sessão...</p>
            </>
          ) : file ? (
            <>
              <FileSpreadsheet className="w-16 h-16 text-accent mb-4" />
              <h3 className="text-lg font-medium text-white">{file.name}</h3>
              <p className="text-sm text-gray-400 mb-4">
                {(file.size / 1024).toFixed(2)} KB
              </p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleUpload();
                }}
                disabled={isUploading}
                className="pointer-events-auto bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {isUploading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <UploadCloud size={20} />
                )}
                {isUploading ? "Processando..." : "Confirmar Importação"}
              </button>
            </>
          ) : (
            <>
              <UploadCloud className="w-16 h-16 text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-white">
                Arraste o arquivo CSV do cliente
              </h3>
              <p className="text-sm text-gray-400 mt-2">
                Ou clique para navegar
              </p>
            </>
          )}
        </div>
      </div>

      {file && uploadStatus !== "success" && (
        <PreviewTable data={previewData as any} />
      )}

      {uploadStatus === "error" && (
        <div className="mt-4 p-4 bg-red-900/20 text-red-400 border border-red-900/50 rounded-lg flex items-center gap-3">
          <AlertCircle />
          <span>
            Erro ao processar o arquivo. Verifique se as colunas correspondem ao
            esperado.
          </span>
        </div>
      )}
    </div>
  );
}
