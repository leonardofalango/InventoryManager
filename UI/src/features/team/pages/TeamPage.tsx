import { useState, useEffect } from "react";
import { Loader2, Plus, UsersRound } from "lucide-react";
import { api } from "../../../lib/axios";
import type { User, Team } from "../../../types";

export function TeamPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("COUNTER");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [newTeamName, setNewTeamName] = useState("");

  const fetchData = async () => {
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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/user", {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        teamId: selectedTeamId || null,
      });
      setShowModal(false);
      resetUserForm();
      fetchData();
    } catch (error) {
      alert("Erro ao cadastrar membro.");
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
      alert("Erro ao criar time.");
    }
  };

  const resetUserForm = () => {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setSelectedTeamId("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            Equipe de Contagem
          </h1>
          <p className="text-gray-400">Gerencie os prestadores de serviço</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTeamModal(true)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors border border-gray-600 flex items-center gap-2"
          >
            <UsersRound size={18} /> Novo Time
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors border border-gray-600 flex items-center gap-2"
          >
            <Plus size={18} /> Adicionar Membro
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-accent" size={48} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col gap-4 relative"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold text-lg">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-medium">{member.name}</h3>
                  <p className="text-sm text-accent flex items-center gap-1 text-gray-400">
                    <UsersRound size={12} />{" "}
                    {member.team ? member.team.name : "Sem Time"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Novo Membro</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                placeholder="Nome"
              />
              <input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                placeholder="Email"
              />
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                placeholder="Senha"
              />

              <div>
                <label className="block text-sm text-gray-400 mb-1">Time</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
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
                  Cargo
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                >
                  <option value="COUNTER">Contador</option>
                  <option value="MANAGER">Gerente</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-300 px-4"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-accent text-white px-4 py-2 rounded"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Time */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Criar Novo Time
            </h2>
            <form onSubmit={handleAddTeam} className="space-y-4">
              <input
                required
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                placeholder="Nome do Time (ex: Alpha)"
              />
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="text-gray-300 px-4"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
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
