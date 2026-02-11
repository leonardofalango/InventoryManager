import { Users, Shield, BadgeCheck } from "lucide-react";

const TEAM_MEMBERS = [
  {
    id: 1,
    name: "Carlos Silva",
    role: "MANAGER",
    team: "Equipe Alpha (Sul)",
    status: "active",
  },
  {
    id: 2,
    name: "Ana Souza",
    role: "COUNTER",
    team: "Equipe Alpha (Sul)",
    status: "active",
  },
  {
    id: 3,
    name: "Roberto Junior",
    role: "COUNTER",
    team: "Equipe Beta (Centro)",
    status: "offline",
  },
  {
    id: 4,
    name: "Fernanda Lima",
    role: "COUNTER",
    team: "Sem Equipe",
    status: "active",
  },
];

export function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            Equipe de Contagem
          </h1>
          <p className="text-gray-400">
            Gerencie os prestadores de serviço e atribua times
          </p>
        </div>
        <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors border border-gray-600">
          Adicionar Membro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TEAM_MEMBERS.map((member) => (
          <div
            key={member.id}
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="text-sm text-accent hover:underline">
                Editar
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold text-lg">
                {member.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-white font-medium">{member.name}</h3>
                <p className="text-sm text-gray-400">{member.team}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              {member.role === "MANAGER" ? (
                <span className="flex items-center gap-1 text-xs font-semibold bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                  <Shield size={12} /> Gerente
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                  <Users size={12} /> Contador
                </span>
              )}

              {member.status === "active" && (
                <span className="flex items-center gap-1 text-xs font-semibold bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  <BadgeCheck size={12} /> Ativo
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
