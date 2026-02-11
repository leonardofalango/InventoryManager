import { BarChart3, Package, CheckCircle2, AlertTriangle } from 'lucide-react';

export function DashboardPage() {
  // Mock dados de um inventário ativo
  const currentInventory = {
    client: "Farmácia Central - Matriz",
    progress: 75,
    totalSKUs: 4500,
    countedSKUs: 3375,
    totalItems: 15230,
    divergences: 120
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Geral</h1>
          <p className="text-gray-400">Visão em tempo real da operação atual</p>
        </div>
        
        <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-3">
           <span className="text-gray-400 text-sm">Inventário Ativo:</span>
           <span className="text-green-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {currentInventory.client}
           </span>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Progresso (PartNumber)" 
          value={`${currentInventory.progress}%`} 
          subtext={`${currentInventory.countedSKUs} de ${currentInventory.totalSKUs} SKUs`}
          icon={BarChart3}
          color="text-accent"
        />
        <StatCard 
          title="Total Contado" 
          value={currentInventory.totalItems.toLocaleString()} 
          subtext="Unidades físicas lidas"
          icon={Package}
          color="text-green-400"
        />
        <StatCard 
          title="Divergências" 
          value={currentInventory.divergences.toString()} 
          subtext="Itens com sobra ou falta"
          icon={AlertTriangle}
          color="text-red-400"
        />
         <StatCard 
          title="Equipe Ativa" 
          value="8" 
          subtext="Contadores online agora"
          icon={CheckCircle2}
          color="text-purple-400"
        />
      </div>

      {/* Barra de Progresso Visual */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Progresso da Cobertura (SKUs Lidos vs Total Cadastro)</h3>
        <div className="relative h-6 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-accent transition-all duration-500"
            style={{ width: `${currentInventory.progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Grid de Acompanhamento Recente (Placeholder) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Últimas Leituras</h3>
          <ul className="space-y-3">
             {[1,2,3,4,5].map(i => (
               <li key={i} className="flex justify-between text-sm border-b border-gray-700 pb-2">
                 <span className="text-gray-300">Dipirona 500mg (789102030)</span>
                 <span className="text-gray-500">Prateleira A-12</span>
               </li>
             ))}
          </ul>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
           <h3 className="text-lg font-semibold text-white mb-4">Status por Setor</h3>
           {/* Aqui você poderia colocar mini barras de progresso por setor */}
           <div className="space-y-4">
              <SectorProgress name="Medicamentos (A-Z)" percent={90} />
              <SectorProgress name="Perfumaria" percent={45} />
              <SectorProgress name="Dermocosméticos" percent={20} />
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

function SectorProgress({ name, percent }: { name: string, percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{name}</span>
        <span className="text-gray-400">{percent}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  )
}