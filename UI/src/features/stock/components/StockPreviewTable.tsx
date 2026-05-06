import type { StockCsvRow } from "../types/stock-types";

interface Props {
  data: StockCsvRow[];
  preview?: number;
}

export function StockPreviewTable({ data, preview }: Props) {
  if (data.length === 0) return null;
  const headers = Object.keys(data[0]);
  const displayData = preview && preview > 0 ? data.slice(0, preview) : data;

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden shadow-sm bg-gray-900 mt-6 w-full">
      <div className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-textAccent">
          Pré-visualização dos Dados ({data.length} registros lidos)
        </h3>
        {preview && preview > 0 && preview < data.length && (
          <span className="text-sm text-gray-300">
            Mostrando os primeiros {preview} registros
          </span>
        )}
      </div>
      <div className="overflow-x-auto overflow-y-auto max-h-96">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-gray-800 text-textSecondary font-medium uppercase text-xs sticky top-0">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 border-b border-gray-700 text-gray-200"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {displayData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-600 transition-colors">
                {headers.map((header) => (
                  <td
                    key={`${index}-${header}`}
                    className="px-4 py-3 text-gray-300"
                  >
                    {String(row[header as keyof StockCsvRow])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
