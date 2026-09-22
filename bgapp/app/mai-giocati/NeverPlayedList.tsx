"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, MapPin } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/fetchClient";

interface Game {
  id: number;
  name: string;
  thumbnail: string | null;
  status: string;
  type: string;
  location: string | null;
}

export default function NeverPlayedList({ initialGames }: { initialGames: Game[] }) {
  const { show } = useToast();
  const [games, setGames] = useState(initialGames);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function markPlayed(g: Game) {
    setBusyId(g.id);
    try {
      const res = await apiFetch(`/api/games/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playedBefore: true }),
      });
      if (res.ok) {
        setGames(prev => prev.filter(x => x.id !== g.id));
        show(`"${g.name}" segnato come già giocato`);
      } else {
        show(res.networkError ? "Connessione assente. Riprova." : "Operazione non riuscita.", "error");
      }
    } finally {
      setBusyId(null);
    }
  }

  if (games.length === 0) {
    return (
      <div className="card text-center" style={{ color: "var(--text-secondary)" }}>
        Nessun gioco senza partite. Li hai giocati tutti.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>{games.length}</strong>{" "}
        {games.length === 1 ? "gioco mai giocato" : "giochi mai giocati"}
      </p>

      <div className="flex flex-col gap-3">
        {games.map(g => (
          <div key={g.id} className="card p-3.5 flex items-center gap-3">
            {g.thumbnail
              ? <img src={g.thumbnail} alt="" className="w-14 h-14 object-contain rounded flex-shrink-0" />
              : <div className="w-14 h-14 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />}

            <div className="flex-1 min-w-0">
              <Link href={`/collection/${g.id}?from=${encodeURIComponent("/mai-giocati")}`}
                className="font-semibold text-base truncate block"
                style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                {g.name}
              </Link>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                <StatusBadge status={g.status} />
                <span>{g.type}</span>
                {g.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} style={{ color: "var(--text-muted)" }} /> {g.location}
                  </span>
                )}
              </div>
            </div>

            <button type="button" onClick={() => markPlayed(g)} disabled={busyId === g.id}
              className="btn-secondary text-sm flex-shrink-0"
              title="Toglilo dall'elenco: l'ho già giocato, non l'avevo registrato">
              {busyId === g.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span className="hidden sm:inline">Già giocato</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
