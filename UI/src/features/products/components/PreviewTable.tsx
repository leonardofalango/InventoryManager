// src/features/products/components/PreviewTable.tsx
import type { ProductCsvRow } from "../types/product-types";

interface Props {
  data: ProductCsvRow[];
}

export function PreviewTable({ data }: Props) {
  if (data.length === 0) return null;
  const headers = Object.keys(data[0]);

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-gray-900 mt-6">
      <div className="p-4 bg-gray-900 border-b flex justify-between items-center">
        <h3 className="font-semibold text-white">Pré-visualização dos Dados</h3>
        <span className="text-s text-gray-300">
          Mostrando os primeiros 5 registros
        </span>
      </div>
      <div className="overflow-x-auto ">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-gray-100 text-gray-700 bg-gray-900 font-medium uppercase text-xs">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 border-b text-gray-200">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-600 transition-colors">
                {headers.map((header) => (
                  <td key={`${index}-${header}`} className="px-4 py-3 text-700">
                    {row[header]}
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
