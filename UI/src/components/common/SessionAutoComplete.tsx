import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Calendar, Loader2, X } from "lucide-react";
import { api } from "../../lib/axios";
import { clsx } from "clsx";

interface SessionAutocompleteProps {
  onSelect: (sessionId: string, clientName: string) => void;
  selectedId?: string;
  selectedName?: string;
  className?: string;
}

export function SessionAutocomplete({
  onSelect,
  selectedId,
  selectedName,
  className,
}: SessionAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(
        `/inventorysession?page=1&pageSize=20&search=${query}`,
      );
      // Dependendo do retorno da API paginada, pode estar em res.data.data ou diretamente em res.data
      const data = res.data.data || (Array.isArray(res.data) ? res.data : []);
      setSessions(data);
    } catch (error) {
      console.error("Erro ao buscar sessões", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => fetchSessions(search), 300);
      return () => clearTimeout(timer);
    }
  }, [search, fetchSessions, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={clsx("relative w-full", className)} ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          className="w-full pl-10 pr-10 py-2 bg-gray-900 border border-gray-700 rounded-lg text-textAccent focus:ring-2 focus:ring-accent outline-none"
          placeholder="Buscar inventário por nome..."
          value={isOpen ? search : selectedName || ""}
          onFocus={() => {
            setIsOpen(true);
            if (!sessions.length) fetchSessions("");
          }}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-accent" />
        ) : selectedId ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("", "");
              setSearch("");
            }}
            title="Limpar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {sessions.length > 0 ? (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s.id, s.clientName);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 flex flex-col border-b border-gray-700/50 last:border-0"
              >
                <span className="text-textAccent font-medium">
                  {s.clientName}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={12} />{" "}
                  {new Date(s.startDate).toLocaleDateString()}
                  {s.status !== undefined &&
                    ` - Status: ${s.status === 0 ? "Agendado" : s.status === 1 ? "Em Andamento" : "Finalizado"}`}
                </span>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              {isLoading ? "Buscando..." : "Nenhum inventário encontrado."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
