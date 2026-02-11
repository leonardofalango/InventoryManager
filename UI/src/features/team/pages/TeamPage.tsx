import { useState, useEffect } from "react";
import { Loader2, Plus, UsersRound, Trash2, UserCog } from "lucide-react";
import { api } from "../../../lib/axios";
import type { User, Team } from "../../../types";
import { useFeedbackStore } from "../../../store/feedbackStore";

export function TeamPage() {
  const showFeedback = useFeedbackStore((state) => state.showFeedback);

  const [members, setMembers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const [editingMember, setEditingMember] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState<"members" | "teams">("members");

  const [userId, setUserId] = useState(""); // Para edição
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("COUNTER");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [newTeamName, setNewTeamName] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, teamsRes] = await Promise.all([
        api.get("/user"),
        api.get("/team"),
      ]);
      setMembers(usersRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewMemberModal = () => {
    resetUserForm();
    setEditingMember(null);
    setShowMemberModal(true);
  };

  const handleUserClick = (member: User) => {
    console.log("EQUIPE:", member.team);
    console.log("EQUIPE:", member.team);
    setEditingMember(member);
    setUserId(member.id);
    setNewName(member.name);
    setNewEmail(member.email);
    setNewRole(member.role);
    setSelectedTeamId(member.team?.id || "");
    setNewPassword("");
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await api.put(`/user/${userId}`, {
          id: userId,
          name: newName,
          role: newRole,
          teamId: selectedTeamId || null,
        });
        showFeedback("Membro atualizado com sucesso!", "success");
      } else {
        await api.post("/user", {
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          teamId: selectedTeamId || null,
        });
        showFeedback("Membro criado com sucesso!", "success");
      }

      setShowMemberModal(false);
      resetUserForm();
      fetchData();
    } catch (error) {
      console.error(error);
      showFeedback("Erro ao salvar membro.", "error");
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/team", { name: newTeamName });
      setShowTeamModal(false);
      setNewTeamName("");
      fetchData();
    } catch (error) {
      showFeedback("Erro ao criar time.", "error");
    }
  };

  const handleDeleteTeam = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este time?")) return;
    try {
      await api.delete(`/team/${id}`);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data || "Erro ao excluir time.";
      showFeedback(msg, "error");
    }
  };

  const resetUserForm = () => {
    setUserId("");
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("COUNTER");
    setSelectedTeamId("");
    setEditingMember(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            Gerenciamento de Equipe
          </h1>
          <p className="text-gray-400">
            Gerencie times e prestadores de serviço
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-4 py-2 rounded-lg transition-colors border ${activeTab === "teams" ? "bg-accent text-white border-accent" : "bg-gray-800 text-gray-300 border-gray-600"}`}
          >
            Times
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-lg transition-colors border ${activeTab === "members" ? "bg-accent text-white border-accent" : "bg-gray-800 text-gray-300 border-gray-600"}`}
          >
            Membros
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        {activeTab === "members" ? (
          <button
            onClick={openNewMemberModal}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-600 flex items-center gap-2"
          >
            <Plus size={18} /> Adicionar Membro
          </button>
        ) : (
          <button
            onClick={() => setShowTeamModal(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-600 flex items-center gap-2"
          >
            <Plus size={18} /> Novo Time
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-accent" size={48} />
        </div>
      ) : (
        <>
          {activeTab === "members" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleUserClick(member)}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col gap-4 cursor-pointer hover:border-accent hover:bg-gray-800/80 transition-all group relative"
                  title="Clique para editar"
                >
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <UserCog className="text-accent" size={20} />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold text-lg">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-medium group-hover:text-accent transition-colors">
                        {member.name}
                      </h3>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <UsersRound size={12} />{" "}
                        {member.team ? member.team.name : "Sem Time"}
                      </p>
                      <span className="text-xs bg-gray-900 px-2 py-1 rounded text-gray-500 mt-1 inline-block border border-gray-700">
                        {member.role === "MANAGER" ? "Gerente" : "Contador"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-gray-500">Nenhum membro cadastrado.</p>
              )}
            </div>
          )}

          {activeTab === "teams" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-white font-medium text-lg">
                      {team.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {(team as any).members?.length || 0} membros
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteTeam(team.id, e)}
                    className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded transition-colors"
                    title="Excluir time"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              {teams.length === 0 && (
                <p className="text-gray-500">Nenhum time cadastrado.</p>
              )}
            </div>
          )}
        </>
      )}

      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingMember ? "Editar Membro" : "Novo Membro"}
            </h2>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome</label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-accent outline-none"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Email
                </label>
                <input
                  required
                  type="email"
                  disabled={!!editingMember}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-accent outline-none"
                  placeholder="email@exemplo.com"
                />
              </div>

              {!editingMember && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Senha
                  </label>
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-accent outline-none"
                    placeholder="Senha de acesso"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Time</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-accent outline-none"
                >
                  <option value="">Sem Equipe</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Função
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-accent outline-none"
                >
                  <option value="COUNTER">Contador</option>
                  <option value="MANAGER">Gerente</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="text-gray-300 px-4 py-2 hover:bg-gray-700 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors font-medium"
                >
                  {editingMember ? "Salvar Alterações" : "Criar Membro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">
              Criar Novo Time
            </h2>
            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Nome do Time
                </label>
                <input
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-accent outline-none"
                  placeholder="Ex: Equipe Alpha"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="text-gray-300 px-4 py-2 hover:bg-gray-700 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  Criar Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
