import { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Package,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  SearchX,
  MapPinCheck,
  Download,
} from "lucide-react";
import { AxiosError } from "axios";
import { api } from "../../../lib/axios";
import type { DashboardData, DiscrepancyItem } from "../types/dashboard-types";
import { SessionAutocomplete } from "../../../components/common/SessionAutoComplete";

const getStatusConfig = (status?: number) => {
  switch (status) {
    case 1:
      return {
        label: "Em Andamento",
        textColor: "text-green-400",
        dotColor: "bg-green-500 animate-pulse",
      };
    case 2:
      return {
        label: "Finalizado",
        textColor: "text-gray-400",
        dotColor: "bg-gray-500",
      };
    default:
      return {
        label: "Agendado",
        textColor: "text-blue-400",
        dotColor: "bg-blue-500",
      };
  }
};

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedSessionName, setSelectedSessionName] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyItem[]>([]);
  const [isLoadingDiscrepancies, setIsLoadingDiscrepancies] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportFullReport = async () => {
    if (!selectedSession) return;
    setIsExporting(true);

    try {
      const response = await api.get(`/Export/full-report/${selectedSession}`);
      const items = response.data;

      const headers = [
        "EAN",
        "Descrição",
        "Categoria",
        "Preço",
        "Esperado",
        "Contado",
        "Diferença",
      ];

      const rows = items.map((item: any) => [
        item.ean,
        `"${item.name || ""}"`,
        `"${item.category || ""}"`,
        item.price,
        item.expectedQuantity,
        item.countedQuantity,
        item.difference,
      ]);

      const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `relatorio_completo_${selectedSessionName || selectedSession}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao exportar relatório completo:", error);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!selectedSession) {
      setData(null);
      setError(null);
      return;
    }

    const fetchDashboardData = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      if (!data) setLoading(true);

      try {
        setError(null);
        const statsRes = await api.get<DashboardData>(
          `/InventorySession/${selectedSession}/dashboard`,
        );
        setData(statsRes.data);
      } catch (err: unknown) {
        const error = err as AxiosError;
        if (error.response?.status === 404) {
          setError("Dados de dashboard não encontrados para este inventário.");
        } else {
          setError("Erro ao carregar dados do dashboard.");
        }
      } finally {
        isFetching.current = false;
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Atualiza a cada 20 segundos
    const interval = setInterval(fetchDashboardData, 20000);
    return () => clearInterval(interval);
  }, [selectedSession]);

  const exportDiscrepanciesToCSV = (
    items: DiscrepancyItem[],
    sessionName: string,
  ) => {
    const headers = ["EAN", "Descrição", "Esperado", "Contado", "Diferença"];
    const rows = items.map((item) => [
      item.ean,
      item.description,
      item.expectedQuantity,
      item.countedQuantity,
      item.difference,
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `discrepancies_${sessionName || selectedSession}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDiscrepanciesClick = async () => {
    if (!selectedSession) return;

    setIsModalOpen(true);
    setIsLoadingDiscrepancies(true);

    try {
      const response = await api.get<DiscrepancyItem[]>(
        `/InventorySession/${selectedSession}/dashboard/discrepancies`,
      );
      setDiscrepancies(response.data);
    } catch (error) {
      console.error("Erro ao buscar divergências:", error);
    } finally {
      setIsLoadingDiscrepancies(false);
    }
  };

  if (!selectedSession) {
    return (
      <div className="flex flex-col space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-textAccent">
              Dashboard Geral
            </h1>
            <p className="text-textSecondary">
              Selecione uma sessão para iniciar o monitoramento
            </p>
          </div>
          <div className="w-full sm:w-96 bg-gray-800 rounded-lg border border-gray-700 p-1">
            <SessionAutocomplete
              selectedId={selectedSession}
              selectedName={selectedSessionName}
              onSelect={(id, name) => {
                setSelectedSession(id);
                setSelectedSessionName(name);
              }}
            />
          </div>
        </div>
        <div className="flex flex-col justify-center items-center h-full min-h-[400px] bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
          <SearchX className="text-gray-500 mb-4" size={48} />
          <p className="text-gray-400 text-lg">
            Nenhum inventário selecionado.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Use a barra de busca acima para visualizar as métricas.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-accent mb-4" size={48} />
        <p className="text-textSecondary">
          Carregando métricas do inventário...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="w-full sm:w-96 bg-gray-800 rounded-lg border border-gray-700 p-1">
          <SessionAutocomplete
            selectedId={selectedSession}
            selectedName={selectedSessionName}
            onSelect={(id, name) => {
              setSelectedSession(id);
              setSelectedSessionName(name);
            }}
          />
        </div>
        <div className="flex justify-center items-center h-full min-h-[300px]">
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
            <AlertTriangle className="text-yellow-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-textAccent mb-2">Atenção</h2>
            <p className="text-textSecondary">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusConfig = getStatusConfig(data.status);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-textAccent">
            Dashboard Geral
          </h1>
          <p className="text-textSecondary">
            Visão da sessão: {selectedSessionName || data.clientName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <button
            onClick={handleExportFullReport}
            disabled={isExporting}
            className="bg-accent hover:bg-accentHover text-textAccent px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 focus:outline-none"
            title="Exportar todas as contagens e discrepâncias (CSV)"
          >
            {isExporting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Download size={18} />
            )}
            <span className="whitespace-nowrap">Exportar Completo</span>
          </button>

          <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-3 w-full sm:w-auto shadow-sm">
            <span className="text-textSecondary text-sm whitespace-nowrap">
              Status:
            </span>
            <span
              className={`${statusConfig.textColor} font-semibold flex items-center gap-2 whitespace-nowrap`}
            >
              <span
                className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`}
              ></span>
              {statusConfig.label}
            </span>
          </div>

          <div className="w-full sm:w-72 bg-gray-800 rounded-lg border border-gray-700 p-1">
            <SessionAutocomplete
              selectedId={selectedSession}
              selectedName={selectedSessionName}
              onSelect={(id, name) => {
                setSelectedSession(id);
                setSelectedSessionName(name);
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Progresso (SKUs)"
          value={`${data.progress}%`}
          subtext={`${data.countedSKUs} de ${data.totalSKUs} SKUs`}
          icon={BarChart3}
          color="text-accent"
        />
        <StatCard
          title="Locais Identificados"
          value={`${Math.round((data.totalLocationsCounted / data.totalLocations) * 100) | 0}%`}
          subtext={`${data.totalLocationsCounted} de ${data.totalLocations} etiquetas`}
          icon={MapPinCheck}
          color="text-blue-400"
        />
        <StatCard
          title="Total Contado"
          value={data.totalItems.toLocaleString()}
          subtext="Unidades físicas lidas"
          icon={Package}
          color="text-green-400"
        />
        <StatCard
          title="Divergências"
          value={data.divergences.toString()}
          subtext="Clique para ver itens com sobra ou falta"
          icon={AlertTriangle}
          color={data.divergences > 0 ? "text-red-400" : "text-textSecondary"}
          onClick={handleDiscrepanciesClick}
        />
        <StatCard
          title="Equipe Ativa"
          value={data.activeCounters.toString()}
          subtext="Contadores na última hora"
          icon={CheckCircle2}
          color="text-purple-400"
        />
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <h3 className="text-lg font-semibold text-textAccent mb-4">
          Progresso da Cobertura (SKUs Lidos vs Total Esperado)
        </h3>
        <div className="relative h-6 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-sky-500 transition-all duration-1000 ease-out"
            style={{ width: `${data.progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-textSecondary">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-textAccent mb-4">
            Últimas Leituras
          </h3>
          {data.recentCounts.length === 0 ? (
            <p className="text-gray-500 text-sm italic">
              Nenhuma leitura registrada ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.recentCounts.map((item, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center text-sm border-b border-gray-700 pb-2"
                >
                  <div>
                    <span className="text-gray-300 block">
                      {item.productName}
                    </span>
                    <span className="text-gray-500 text-xs">
                      EAN: {item.ean} |{" "}
                      {new Date(item.countedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-textAccent font-medium block">
                      Qtd: {item.quantity}
                    </span>
                    <span className="text-gray-500 text-xs">
                      Prateleira: {item.productLocation}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-textAccent mb-4">
            Status por Setor / Local
          </h3>
          <div className="space-y-4">
            {data.sectors && data.sectors.length > 0 ? (
              data.sectors.map((sector, idx) => (
                <SectorProgress
                  key={idx}
                  name={sector.name}
                  percent={sector.percent}
                />
              ))
            ) : (
              <p className="text-gray-500 text-sm italic">
                Nenhum setor encontrado para este inventário.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE DIVERGÊNCIAS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col animate-fade-in">
            {/* Header do Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div className="title">
                <h2 className="text-xl font-bold text-textAccent flex items-center gap-2">
                  <AlertTriangle className="text-yellow-500" size={24} />
                  Itens com Divergência
                </h2>
              </div>
              <div className="actions flex items-center gap-4">
                <button
                  onClick={() =>
                    exportDiscrepanciesToCSV(discrepancies, selectedSessionName)
                  }
                  className="text-sm font-medium text-white bg-accent hover:bg-accentHover transition-colors px-4 py-2 rounded-lg focus:outline-none"
                >
                  Exportar Discrepancias
                </button>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors focus:outline-none"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Corpo do Modal (Tabela) */}
            <div className="p-0 overflow-y-auto flex-1">
              {isLoadingDiscrepancies ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="animate-spin text-accent" size={40} />
                  <span className="ml-3 text-textSecondary text-lg">
                    Buscando itens...
                  </span>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-700 text-left">
                  <thead className="bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        EAN
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Esperado
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Contado
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Diferença
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {discrepancies.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-sm text-gray-500"
                        >
                          Nenhuma divergência encontrada nesta sessão.
                        </td>
                      </tr>
                    ) : (
                      discrepancies.map((item, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-750 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textAccent">
                            {item.ean}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-400">
                            {item.expectedQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-textAccent">
                            {item.countedQuantity}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm text-center font-bold ${
                              item.difference < 0
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                          >
                            {item.difference > 0 ? "+" : ""}
                            {item.difference}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtext, icon: Icon, color, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-sm transition-all ${
        onClick
          ? "cursor-pointer hover:border-gray-500 hover:bg-gray-700"
          : "hover:border-gray-600"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-textSecondary mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-textAccent">{value}</h4>
          <p className="text-xs text-gray-500 mt-1">{subtext}</p>
        </div>
        <div className={`p-2 rounded-lg bg-gray-700/50 ${color}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function SectorProgress({ name, percent }: { name: string; percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{name}</span>
        <span className="text-textSecondary">{percent}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-500 transition-all duration-1000"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}
