import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  X,
  CheckCircle,
  Play,
  Users,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { api } from "../../../lib/axios";
import { useFeedbackStore } from "../../../store/feedbackStore";

interface InventorySessionModel {
  id: string;
  clientName: string;
  status: number;
  startDate: string;
  endDate?: string;
  teamId?: string;
  totalItemsCounted: number;
  uniqueItemsCounted: number;
}

interface TeamModel {
  id: string;
  name: string;
}

const formatDateForInput = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export function InventoryListPage() {
  const [sessions, setSessions] = useState<InventorySessionModel[]>([]);
  const [teams, setTeams] = useState<TeamModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const showFeedback = useFeedbackStore((state) => state.showFeedback);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<InventorySessionModel | null>(null);

  const [formData, setFormData] = useState({
    clientName: "",
    teamId: "",
    startDate: "",
    endDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/inventorysession", {
        params: {
          page,
          pageSize,
          search: debouncedSearch || undefined,
        },
      });

      setSessions(response.data.data || response.data);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (error: any) {
      showFeedback("Erro ao carregar os inventários.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, showFeedback]);

  const fetchTeams = async () => {
    try {
      const response = await api.get("/team");
      setTeams(response.data);
    } catch (error: any) {
      console.error("Erro ao carregar times", error);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleOpenCreate = () => {
    setFormData({ clientName: "", teamId: "", startDate: "", endDate: "" });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (session: InventorySessionModel) => {
    setSelectedSession(session);
    setFormData({
      clientName: session.clientName,
      teamId: session.teamId || "",
      startDate: formatDateForInput(session.startDate),
      endDate: formatDateForInput(session.endDate),
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim() || !formData.startDate) return;

    try {
      setIsSubmitting(true);
      await api.post("/inventorysession", {
        clientName: formData.clientName,
        teamId: formData.teamId || null,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate
          ? new Date(formData.endDate).toISOString()
          : null,
      });
      showFeedback("Inventário criado com sucesso!", "success");
      setIsCreateModalOpen(false);
      fetchSessions();
    } catch (error: any) {
      showFeedback("Erro ao criar inventário.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !formData.clientName.trim() || !formData.startDate)
      return;

    try {
      setIsSubmitting(true);
      await api.put(`/inventorysession/${selectedSession.id}`, {
        clientName: formData.clientName,
        teamId: formData.teamId || null,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate
          ? new Date(formData.endDate).toISOString()
          : null,
      });
      showFeedback("Inventário atualizado com sucesso!", "success");
      setIsEditModalOpen(false);
      fetchSessions();
    } catch (error: any) {
      showFeedback("Erro ao atualizar inventário.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    e: React.MouseEvent,
    id: string,
    newStatus: number,
  ) => {
    e.stopPropagation();
    try {
      await api.put(`/inventorysession/${id}/status`, { status: newStatus });
      showFeedback("Status do inventário atualizado.", "success");
      fetchSessions();
    } catch (error: any) {
      showFeedback("Erro ao atualizar o status.", "error");
    }
  };

  const getStatusInfo = (status: number | string) => {
    // Trata tanto número (antigo) quanto string mapeada do Enum (novo endpoint)
    const statusVal =
      typeof status === "string"
        ? status === "Open"
          ? 0
          : status === "InProgress"
            ? 1
            : 2
        : status;

    switch (statusVal) {
      case 1:
        return {
          label: "Em Andamento",
          color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        };
      case 2:
        return {
          label: "Finalizado",
          color: "bg-green-500/10 text-green-500 border-green-500/20",
        };
      default:
        return {
          label: "Agendado",
          color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">
            Gerenciamento de Inventários
          </h1>
          <p className="text-textSecondary">
            Gerencie os clientes e cronogramas de contagem
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-accent hover:bg-accent/70 text-textAccent px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> <span>Novo Cliente / Inventário</span>
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por nome da farmácia via servidor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 pl-10 pr-4 text-gray-200 focus:outline-none focus:border-accent"
          />
          {/* Indicador visual de que está buscando no servidor */}
          {isLoading && searchTerm !== debouncedSearch && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-accent" />
          )}
        </div>
      </div>

      {isLoading && sessions.length === 0 ? (
        <div className="text-center py-10 flex flex-col items-center text-textSecondary gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          Carregando inventários...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-800/50 rounded-lg border border-gray-700/50">
              Nenhum inventário encontrado.
            </div>
          ) : (
            sessions.map((session) => {
              const statusInfo = getStatusInfo(session.status);
              // Verifica o valor numérico do status caso ele venha como string do backend
              const statusNum =
                typeof session.status === "string"
                  ? session.status === "Open"
                    ? 0
                    : session.status === "InProgress"
                      ? 1
                      : 2
                  : session.status;

              return (
                <div
                  key={session.id}
                  onClick={() => handleOpenEdit(session)}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-5 flex items-center justify-between hover:border-gray-500 hover:bg-gray-700/50 transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-300">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-textAccent group-hover:text-accent flex items-center gap-2">
                        {session.clientName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-textSecondary mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />{" "}
                          {new Date(session.startDate).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                        <span>
                          • {session.totalItemsCounted?.toLocaleString() || 0}{" "}
                          itens totais lidos
                        </span>
                        <span>
                          • {session.uniqueItemsCounted?.toLocaleString() || 0}{" "}
                          produtos únicos
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>

                    <div className="flex items-center gap-2">
                      {statusNum === 0 && (
                        <button
                          onClick={(e) => handleUpdateStatus(e, session.id, 1)}
                          className="text-yellow-500 hover:text-yellow-400 flex items-center gap-1 text-sm bg-gray-900 px-2 py-1 rounded border border-gray-700"
                        >
                          <Play size={16} /> Iniciar
                        </button>
                      )}
                      {statusNum === 1 && (
                        <button
                          onClick={(e) => handleUpdateStatus(e, session.id, 2)}
                          className="text-green-500 hover:text-green-400 flex items-center gap-1 text-sm bg-gray-900 px-2 py-1 rounded border border-gray-700"
                        >
                          <CheckCircle size={16} /> Finalizar
                        </button>
                      )}
                      <button className="text-textSecondary hover:text-textAccent ml-2 flex items-center gap-1">
                        <Edit3 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Controles de Paginação (Somente exibe se houver itens) */}
      {sessions.length > 0 && (
        <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700 mt-4 text-sm text-textSecondary">
          <span>
            Mostrando página {page} de {totalPages || 1}
          </span>
          <span>Total de inventários: {totalItems}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* O Modal permanece exatamente o mesmo, mantendo sua UI intacta */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-textAccent">
                {isEditModalOpen ? "Detalhes do Inventário" : "Novo Inventário"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-textSecondary hover:text-textAccent"
              >
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={
                isEditModalOpen ? handleUpdateSession : handleCreateSession
              }
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nome do Cliente / Farmácia *
                </label>
                <input
                  disabled={isSubmitting || selectedSession?.status === 2}
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-textAccent focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                  <Users size={16} /> Equipe Responsável
                </label>
                <select
                  disabled={isSubmitting || selectedSession?.status === 2}
                  value={formData.teamId}
                  onChange={(e) =>
                    setFormData({ ...formData, teamId: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-textAccent focus:outline-none focus:border-accent"
                >
                  <option value="">Nenhuma equipe selecionada</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Início Agendado *
                  </label>
                  <input
                    disabled={isSubmitting || selectedSession?.status === 2}
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-textAccent focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fim Estimado / Realizado
                  </label>
                  <input
                    disabled={isSubmitting || selectedSession?.status === 2}
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-textAccent focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {isEditModalOpen && selectedSession && (
                <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700 flex justify-between text-sm">
                  <div>
                    <p className="text-textSecondary">Total de Lançamentos</p>
                    <p className="text-textAccent font-bold text-lg">
                      {selectedSession.totalItemsCounted}
                    </p>
                  </div>
                  <div>
                    <p className="text-textSecondary">Produtos Únicos</p>
                    <p className="text-textAccent font-bold text-lg">
                      {selectedSession.uniqueItemsCounted}
                    </p>
                  </div>
                  <div>
                    <p className="text-textSecondary">Status Atual</p>
                    <p
                      className={`font-bold text-lg ${getStatusInfo(selectedSession.status).color.split(" ")[1]}`}
                    >
                      {getStatusInfo(selectedSession.status).label}
                    </p>
                  </div>
                </div>
              )}
              {selectedSession?.status === 0 ||
              selectedSession?.status === 1 ||
              selectedSession == null ? (
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-accent hover:bg-accent/70 text-textAccent px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSubmitting
                      ? "Salvando..."
                      : isEditModalOpen
                        ? "Salvar Alterações"
                        : "Criar Inventário"}
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
