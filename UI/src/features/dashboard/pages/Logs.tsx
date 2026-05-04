import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  PlusCircle,
  Edit,
  Trash2,
  Activity,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react";
import { api } from "../../../lib/axios";

interface AuditLog {
  id: number;
  userId?: string;
  type: string;
  log: string;
  datetime: string;
  tableName?: string;
  oldValues?: string;
  newValues?: string;
  affectedColumns?: string;
  primaryKey?: string;
}

const COLORS = {
  Create: "#10B981",
  Update: "#3B82F6",
  Delete: "#EF4444",
  Default: "#6B7280",
};

const ICONS = {
  Create: <PlusCircle className="w-5 h-5 text-emerald-500" />,
  Update: <Edit className="w-5 h-5 text-blue-500" />,
  Delete: <Trash2 className="w-5 h-5 text-red-500" />,
  Default: <Activity className="w-5 h-5 text-gray-500" />,
};

export const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get("/AuditLog");
        setLogs(response.data);
        setError(false);
      } catch (error) {
        console.error("Erro ao buscar logs", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const logsByType = logs.reduce(
    (acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const pieChartData = Object.keys(logsByType).map((key) => ({
    name: key,
    value: logsByType[key],
  }));

  const logsByTable = logs.reduce(
    (acc, log) => {
      const table = log.tableName || "Desconhecida";
      acc[table] = (acc[table] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const barChartData = Object.keys(logsByTable)
    .map((key) => ({ name: key, acessos: logsByTable[key] }))
    .sort((a, b) => b.acessos - a.acessos)
    .slice(0, 5);

  const toggleRow = (id: number) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const formatJsonStr = (str?: string) => {
    if (!str) return "Nenhum dado";
    try {
      const obj = JSON.parse(str);
      return JSON.stringify(obj, null, 2);
    } catch {
      return str;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Montando dashboard de logs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        Erro ao carregar logs. Tente novamente mais tarde.
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">
            Auditoria & Logs
          </h1>
          <p className="text-slate-500 mt-1">
            Análise de operações, histórico de tabelas e rastreabilidade de
            dados.
          </p>
        </div>
        <div className="bg-slate-800 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg flex items-center gap-2">
          <Database className="w-5 h-5" />
          {logs.length} Registros Totais
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-700 mb-4">
            Distribuição de Operações
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[entry.name as keyof typeof COLORS] ||
                        COLORS.Default
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-700 mb-4">
            Top 5 Tabelas Modificadas
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="acessos" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-700">
            Rastreabilidade Detalhada
          </h2>
        </div>

        <div className="overflow-x-auto max-h-[700px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">Ação</th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Tabela (PK)
                </th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Usuário
                </th>
                <th className="p-4 text-sm font-bold text-slate-600">Data</th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Info
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => toggleRow(log.id)}
                  >
                    <td className="p-4">
                      <span
                        className="flex items-center gap-2 font-semibold text-sm"
                        style={{
                          color:
                            COLORS[log.type as keyof typeof COLORS] ||
                            COLORS.Default,
                        }}
                      >
                        {ICONS[log.type as keyof typeof ICONS] || ICONS.Default}
                        {log.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-700">
                      <span className="font-semibold">
                        {log.tableName || "N/A"}
                      </span>
                      {log.primaryKey && (
                        <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                          PK: {log.primaryKey}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {log.userId || "Sistema"}
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {new Date(log.datetime).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-4 text-right">
                      {expandedRowId === log.id ? (
                        <ChevronUp className="w-5 h-5 inline-block text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 inline-block text-slate-400" />
                      )}
                    </td>
                  </tr>

                  {expandedRowId === log.id && (
                    <tr className="bg-slate-50/50">
                      <td
                        colSpan={5}
                        className="p-6 border-b-2 border-indigo-100"
                      >
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Motivo / Log Descritivo
                          </h4>
                          <p className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">
                            {log.log}
                          </p>
                        </div>

                        {log.affectedColumns && (
                          <div className="mb-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Colunas Afetadas:{" "}
                            </span>
                            <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                              {log.affectedColumns}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-red-600 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>{" "}
                              Valores Antigos
                            </h4>
                            <pre className="bg-slate-800 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto shadow-inner h-48 custom-scrollbar">
                              {formatJsonStr(log.oldValues)}
                            </pre>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
                              Valores Novos
                            </h4>
                            <pre className="bg-slate-800 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto shadow-inner h-48 custom-scrollbar">
                              {formatJsonStr(log.newValues)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
