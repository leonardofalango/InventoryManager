import { useState, useEffect, useCallback } from "react";
import { Search, Calendar, Loader2 } from "lucide-react";
import { api } from "../../lib/axios";
import { clsx } from "clsx";

interface SessionAutocompleteProps {
  onSelect: (sessionId: string) => void;
  selectedId?: string;
  className?: string;
}

export function SessionAutocomplete({
  onSelect,
  selectedId,
  className,
}: SessionAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSessions = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(
        `/inventorysession?page=1&pageSize=20&search=${query}`,
      );
      setSessions(res.data.data);
    } catch (error) {
      console.error("Erro ao buscar sessões", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchSessions(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchSessions]);

  const selectedSession = sessions.find((s) => s.id === selectedId);

  return (
    <div className={clsx("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-textAccent focus:ring-2 focus:ring-accent outline-none"
          placeholder="Buscar inventário por nome ou data..."
          value={isOpen ? search : selectedSession?.clientName || ""}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-accent" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {sessions.length > 0 ? (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelect(s.id);
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
                  {new Date(s.startDate).toLocaleDateString()} - Status:{" "}
                  {s.status}
                </span>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              Nenhum inventário encontrado.
            </div>
          )}
        </div>
      )}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
