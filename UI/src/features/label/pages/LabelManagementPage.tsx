import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { api } from "../../../lib/axios";
import { useFeedbackStore } from "../../../store/feedbackStore";

interface ProductLocation {
  id: string;
  barcode: string;
  description: string;
}

export const LabelManagementPage = () => {
  const [shelves, setShelves] = useState<ProductLocation[]>([]);
  const [loading, setLoading] = useState(false);

  const showFeedback = useFeedbackStore((state) => state.showFeedback);

  const [isAdding, setIsAdding] = useState(false);
  const [newBarcode, setNewBarcode] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchShelves = async () => {
    try {
      setLoading(true);
      const response = await api.get("/productlocation");
      setShelves(response.data);
    } catch (error) {
      console.error("Erro ao buscar prateleiras", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelves();
  }, []);

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarcode || !newDescription) return;

    try {
      await api.post("/productlocation", {
        barcode: newBarcode,
        description: newDescription,
      });
      setNewBarcode("");
      setNewDescription("");
      setIsAdding(false);
      fetchShelves();
    } catch (error) {
      console.error("Erro ao criar prateleira", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta prateleira?")) return;
    try {
      await api.delete(`/productlocation/${id}`);
      fetchShelves();
    } catch (error) {
      console.error("Erro ao deletar", error);
    }
  };

  const generateZPL = (shelfCode: string, description: string) => {
    return `
      ^XA
      ^FO50,50^A0N,50,50^FD${description}^FS
      ^FO50,120^BCN,100,Y,N,N^FD${shelfCode}^FS
      ^XZ
    `;
  };

  const printZebra = async (shelf: ProductLocation) => {
    const zplCode = generateZPL(shelf.barcode, shelf.description);
    console.log("Enviando ZPL para impressora:", zplCode);
    showFeedback(
      `ZPL gerado para ${shelf.barcode}. Verifique o console.`,
      "info",
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    shelves.forEach((shelf, index) => {
      if (index > 0) doc.addPage();
      doc.text(`Etiqueta: ${shelf.description}`, 10, 10);
      doc.text(`Código: ${shelf.barcode}`, 10, 20);
    });
    doc.save("etiquetas.pdf");
    showFeedback(
      "Função de exportação PDF a ser implementada com jsPDF.",
      "error",
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-300">
        Gerenciamento de Etiquetas de Prateleiras
      </h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isAdding ? "Cancelar" : "+ Nova Prateleira"}
        </button>
        <button
          onClick={exportPDF}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Exportar todas em PDF
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleCreateShelf}
          className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700 flex gap-4 items-end"
        >
          <div>
            <label className="block text-gray-300 mb-1">
              Código (Ex: PRAT-001)
            </label>
            <input
              type="text"
              value={newBarcode}
              onChange={(e) => setNewBarcode(e.target.value)}
              className="px-3 py-2 rounded bg-gray-900 border border-gray-600 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Descrição</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="px-3 py-2 rounded bg-gray-900 border border-gray-600 text-white w-64"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Salvar
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400">Carregando etiquetas...</p>
      ) : (
        <table className="min-w-full border bg-gray-900/50 text-gray-300 rounded-lg border-gray-700">
          <thead>
            <tr>
              <th className="border border-gray-700 px-4 py-2 text-left">
                Código
              </th>
              <th className="border border-gray-700 px-4 py-2 text-left">
                Descrição
              </th>
              <th className="border border-gray-700 px-4 py-2 text-left">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {shelves.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="border border-gray-700 px-4 py-4 text-center"
                >
                  Nenhuma prateleira cadastrada.
                </td>
              </tr>
            ) : (
              shelves.map((shelf) => (
                <tr key={shelf.id}>
                  <td className="border border-gray-700 px-4 py-2 font-mono">
                    {shelf.barcode}
                  </td>
                  <td className="border border-gray-700 px-4 py-2">
                    {shelf.description}
                  </td>
                  <td className="border border-gray-700 px-4 py-2 flex gap-2">
                    <button
                      onClick={() => printZebra(shelf)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Imprimir ZPL
                    </button>
                    <button
                      onClick={() => handleDelete(shelf.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
