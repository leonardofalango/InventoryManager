import { useState } from "react";
import { Plus, Search, MoreVertical, Calendar, MapPin } from "lucide-react";
import type { InventorySession } from "../../../types";

// Mock Data
const MOCK_SESSIONS: InventorySession[] = [
  {
    id: "1",
    clientId: "c1",
    clientName: "Farmácia Central - Matriz",
    status: "IN_PROGRESS",
    startDate: "2024-02-10",
    totalItemsCounted: 1450,
    accuracy: 98.5,
  },
  {
    id: "2",
    clientId: "c2",
    clientName: "Drogaria São João",
    status: "OPEN",
    startDate: "2024-02-12",
    totalItemsCounted: 0,
  },
  {
    id: "3",
    clientId: "c3",
    clientName: "Farmácia Popular Filial 2",
    status: "CLOSED",
    startDate: "2024-01-20",
    totalItemsCounted: 5300,
    accuracy: 99.8,
  },
];

export function InventoryListPage() {
  const [sessions] = useState(MOCK_SESSIONS);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "CLOSED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "Em Progresso";
      case "CLOSED":
        return "Finalizado";
      case "OPEN":
        return "Agendado";
      case "AUDIT":
        return "Em Auditoria";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            Gerenciamento de Inventários
          </h1>
          <p className="text-gray-400">
            Gerencie os clientes e cronogramas de contagem
          </p>
        </div>
        <button className="bg-accent hover:bg-sky-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={20} />
          <span>Novo Cliente / Inventário</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por nome da farmácia..."
            className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 pl-10 pr-4 text-gray-200 focus:outline-none focus:border-accent"
          />
        </div>
        <select className="bg-gray-900 border border-gray-700 text-gray-300 rounded-md px-4 py-2 focus:outline-none focus:border-accent">
          <option value="ALL">Todos os Status</option>
          <option value="OPEN">Agendado</option>
          <option value="IN_PROGRESS">Em Andamento</option>
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-5 flex items-center justify-between hover:border-gray-600 transition-colors"
          >
            <div className="flex gap-4 items-center">
              <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-300">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">
                  {session.clientName}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />{" "}
                    {new Date(session.startDate).toLocaleDateString("pt-BR")}
                  </span>
                  {session.totalItemsCounted > 0 && (
                    <span>
                      • {session.totalItemsCounted.toLocaleString()} itens
                      contados
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}
              >
                {getStatusLabel(session.status)}
              </span>
              <button className="text-gray-400 hover:text-white">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
