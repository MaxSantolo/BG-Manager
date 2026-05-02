"use client";

import { useState, useRef } from "react";
import { Search, Loader2, ExternalLink, X, AlertCircle } from "lucide-react";
import type { BggSearchResult, BggGameDetail } from "@/lib/bgg";

interface Props {
  onSelect: (game: BggGameDetail) => void;
  selectedName?: string;
  onClear?: () => void;
}

export default function BggSearch({ onSelect, selectedName, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BggSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function search(q: string) {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bgg?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`BGG error ${res.status}`);
      const data = await res.json();
      setResults(data);
      setOpen(true);
    } catch {
      setError("Errore connessione BGG");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 600);
  }

  async function selectResult(r: BggSearchResult) {
    setLoadingId(r.id);
    setError(null);
    try {
      const res = await fetch(`/api/bgg?id=${r.id}`);
      if (!res.ok) throw new Error(`BGG error ${res.status}`);
      const detail: BggGameDetail = await res.json();
      setOpen(false);
      setQuery("");
      setResults([]);
      onSelect(detail);
    } catch {
      setError("Impossibile caricare i dati da BGG");
    } finally {
      setLoadingId(null);
    }
  }

  // If a game is already linked to BGG, show a chip
  if (selectedName) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
        >
          <ExternalLink size={12} style={{ color: "var(--text-muted)" }} />
          <span>{selectedName}</span>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="btn-ghost p-1.5 text-xs flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={12} /> Cambia
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={15}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Cerca su BoardGameGeek…"
          className="w-full"
          style={{ paddingLeft: "2rem", paddingRight: "2rem" }}
        />
        {loading && (
          <Loader2
            size={15}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs" style={{ color: "var(--accent-red-light)" }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {open && results.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
            maxHeight: "280px",
            overflowY: "auto",
          }}
        >
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => selectResult(r)}
              disabled={loadingId !== null}
              className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-opacity-80 transition-colors"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                {r.name}
                {r.yearPublished && (
                  <span className="ml-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    ({r.yearPublished})
                  </span>
                )}
              </span>
              {loadingId === r.id ? (
                <Loader2 size={13} className="animate-spin" style={{ color: "var(--accent-blue-light)" }} />
              ) : (
                <ExternalLink size={12} style={{ color: "var(--text-muted)" }} />
              )}
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg px-3 py-3 text-sm"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
            color: "var(--text-muted)",
          }}
        >
          Nessun risultato trovato su BGG
        </div>
      )}
    </div>
  );
}
