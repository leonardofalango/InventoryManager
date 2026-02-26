import { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Package,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AxiosError } from "axios";
import { api } from "../../../lib/axios";
import type { DashboardData } from "../types/dashboard-types";

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        setError(null);
        const activeRes = await api.get("/InventorySession/active");
        const sessionId = activeRes.data.id;

        const statsRes = await api.get<DashboardData>(
          `/InventorySession/${sessionId}/dashboard`,
        );
        setData(statsRes.data);
      } catch (err: unknown) {
        const error = err as AxiosError;
        if (error.response?.status === 404) {
          setError("Nenhum inventário ativo para a sua equipe no momento.");
        } else {
          setError("Erro ao carregar dados do dashboard.");
        }
      } finally {
        isFetching.current = false;
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Atualiza a cada 5 segundos
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-accent mb-4" size={48} />
        <p className="text-gray-400">Carregando métricas do inventário...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
          <AlertTriangle className="text-yellow-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">Atenção</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Geral</h1>
          <p className="text-gray-400">Visão em tempo real da operação atual</p>
        </div>

        <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-3">
          <span className="text-gray-400 text-sm">Inventário Ativo:</span>
          <span className="text-green-400 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {data.clientName}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Progresso (SKUs)"
          value={`${data.progress}%`}
          subtext={`${data.countedSKUs} de ${data.totalSKUs} SKUs`}
          icon={BarChart3}
          color="text-accent"
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
          subtext="Itens com sobra ou falta"
          icon={AlertTriangle}
          color={data.divergences > 0 ? "text-red-400" : "text-gray-400"}
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
        <h3 className="text-lg font-semibold text-white mb-4">
          Progresso da Cobertura (SKUs Lidos vs Total Esperado)
        </h3>
        <div className="relative h-6 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-accent transition-all duration-1000 ease-out"
            style={{ width: `${data.progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
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
                    <span className="text-white font-medium block">
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
          <h3 className="text-lg font-semibold text-white mb-4">
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
                Nenhuma leitura vinculada a um local ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, icon: Icon, color }: any) {
  return (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-sm hover:border-gray-600 transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-white">{value}</h4>
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
        <span className="text-gray-400">{percent}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-1000"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}
