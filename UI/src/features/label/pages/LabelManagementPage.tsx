import React, { useState, useEffect } from "react";
// Importações de componentes da UI e API (Axios)

export const LabelManagementPage = () => {
  const [shelves, setShelves] = useState([]);

  useEffect(() => {
    // api.get('/api/shelves').then(...)
  }, []);

  // Get ZebraProgramming
  const generateZPL = (shelfCode: string, description: string) => {
    return `
      ^XA
      ^FO50,50^A0N,50,50^FD${description}^FS
      ^FO50,120^BCN,100,Y,N,N^FD${shelfCode}^FS
      ^XZ
    `;
  };

  // Função para imprimir na Zebra via rede
  const printZebra = async (shelf: { barcode: any; description: any }) => {
    const zplCode = generateZPL(shelf.barcode, shelf.description);
    //send to PRINTER IP
    console.log("Enviando ZPL para impressora:", zplCode);
  };

  const exportPDF = () => {
    // Use jsPDF to generate barcode
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-300">
        Gerenciamento de Etiquetas de Prateleiras
      </h1>

      <div className="flex gap-4 mb-6">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          + Nova Prateleira
        </button>
        <button
          onClick={exportPDF}
          className="bg-gray-600 text-white px-4 py-2 rounded"
        >
          Exportar todas em PDF
        </button>
      </div>

      <table className="min-w-full border bg-gray-900/50 text-gray-300 rounded-lg border border-gray-700">
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
          <tr>
            <td className="border border-gray-700 px-4 py-2">PRAT-001</td>
            <td className="border border-gray-700 px-4 py-2">
              Corredor 1 - Seção A
            </td>
            <td className="border border-gray-700 px-4 py-2 flex gap-2">
              <button
                onClick={() =>
                  printZebra({ barcode: "PRAT-001", description: "Corredor 1" })
                }
                className="bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                Imprimir Zebra
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
