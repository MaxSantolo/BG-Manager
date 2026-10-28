"use client";

import { useEffect, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

export interface BaseGame { id: number; name: string }

interface Hit { id: number; name: string; thumbnail: string | null; yearPublished: number | null }

/**
 * "Espansione per": cerca il gioco base tra quelli che possono esserlo (non
 * espansioni). Facoltativo: si può lasciare vuoto o svuotare con la X.
 */
export default function BaseGamePicker({
  value, onChange, excludeId,
}: { value: BaseGame | null; onChange: (g: BaseGame | null) => void; excludeId?: number }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (value || term.length < 2) { setHits([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      const res = await apiFetch<{ games: Hit[] }>(
        `/api/games?baseOnly=1&limit=15&search=${encodeURIComponent(term)}`);
      if (!cancelled) {
        setHits((res.data?.games ?? []).filter(g => g.id !== excludeId));
        setBusy(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, value, excludeId]);

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{value.name}</span>
        <button type="button" onClick={() => { onChange(null); setQ(""); }}
          className="btn-ghost p-1" aria-label="Togli il gioco base" title="Togli il gioco base">
          <X size={14} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Cerca il gioco base… (facoltativo)" className="w-full pl-8 text-sm" />
        {busy && <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin"
          style={{ color: "var(--text-muted)" }} />}
      </div>
      {hits.length > 0 && (
        <div className="rounded-lg overflow-hidden border text-sm max-h-56 overflow-y-auto"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elevated)" }}>
          {hits.map(g => (
            <button key={g.id} type="button" onClick={() => { onChange({ id: g.id, name: g.name }); setQ(""); }}
              className="w-full text-left px-3 py-1.5 hover:bg-white/5 flex items-center gap-2">
              {g.thumbnail
                ? <img src={g.thumbnail} alt="" className="w-6 h-6 object-contain rounded flex-shrink-0" />
                : <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-card)" }} />}
              <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{g.name}</span>
              {g.yearPublished && <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{g.yearPublished}</span>}
            </button>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && !busy && hits.length === 0 && (
        <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>Nessun gioco base con questo nome.</p>
      )}
    </div>
  );
}
