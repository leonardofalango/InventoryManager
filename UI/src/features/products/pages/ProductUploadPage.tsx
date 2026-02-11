import { useState } from "react";
import Papa from "papaparse";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { PreviewTable } from "../components/PreviewTable";
import type { ProductCsvRow } from "../types/product-types";
import { clsx } from "clsx";

export function ProductUploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ProductCsvRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleFile = (selectedFile: File) => {
    if (
      (selectedFile && selectedFile.type.includes("csv")) ||
      selectedFile.name.endsWith(".csv")
    ) {
      setFile(selectedFile);
      setUploadStatus("idle");

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        preview: 5,
        complete: (results) => {
          setPreviewData(results.data as ProductCsvRow[]);
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Simulação de Envio para API
  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    // TODO: backend call
    // const formData = new FormData();
    // formData.append('file', file);
    // await api.post('/products/import', formData);

    setTimeout(() => {
      setIsUploading(false);
      setUploadStatus("success");
      setTimeout(() => {
        setFile(null);
        setPreviewData([]);
        setUploadStatus("idle");
      }, 3000);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-300">
          Importação de Produtos
        </h1>
        <p className="text-gray-400">
          Faça upload da lista mestre de produtos (CSV) para iniciar o
          inventário.
        </p>
      </div>

      {/* Drag & Drop */}
      <div
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out",
          dragActive
            ? "border-accent bg-blue-50"
            : "border-gray-300 hover:border-gray-400 bg-gray-200",
          uploadStatus === "success" && "border-green-500 bg-green-50",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
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
              <p className="text-green-600">
                Os produtos foram salvos no banco de dados.
              </p>
            </>
          ) : file ? (
            <>
              <FileSpreadsheet className="w-16 h-16 text-accent mb-4" />
              <h3 className="text-lg font-medium text-gray-900">{file.name}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {(file.size / 1024).toFixed(2)} KB
              </p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleUpload();
                }}
                disabled={isUploading}
                className="pointer-events-auto bg-primary text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors flex items-center gap-2"
              >
                {isUploading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <UploadCloud size={20} className="text-gray-700" />
                )}
                {isUploading ? "Processando..." : "Confirmar e Enviar"}
              </button>
            </>
          ) : (
            <>
              <UploadCloud className="w-16 h-16 text-gray-700 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                Arraste seu arquivo CSV aqui
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                ou clique para selecionar do computador
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Formato aceito: .csv (UTF-8)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Preview da Tabela */}
      {file && uploadStatus !== "success" && (
        <PreviewTable data={previewData} />
      )}

      {/* Mensagem de Erro (Exemplo) */}
      {uploadStatus === "error" && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle />
          <span>
            Erro ao processar o arquivo. Verifique se o formato está correto.
          </span>
        </div>
      )}
    </div>
  );
}
