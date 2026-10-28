"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatDayNum } from "@/lib/dates";

interface Sold {
  id: number; name: string; thumbnail: string | null; type: string;
  cost: number | null; salePrice: number | null; saleDate: string | null;
}

const eur = (n: number) => `€${n.toFixed(2)}`;
/** Con segno davanti alla valuta: "+€5.00" / "−€10.72" (non "€-10.72"). */
const signedEur = (n: number) => `${n >= 0 ? "+" : "−"}${eur(Math.abs(n))}`;

export default function SoldList({ games }: { games: Sold[] }) {
  const [q, setQ] = useState("");

  // Totali su tutti i venduti (stabili mentre cerchi), come nelle statistiche:
  // un prezzo mancante conta zero.
  const revenue = games.reduce((s, g) => s + (g.salePrice ?? 0), 0);
  const spent   = games.reduce((s, g) => s + (g.cost ?? 0), 0);
  const pl      = revenue - spent;

  const term = q.trim().toLowerCase();
  const shown = term ? games.filter((g) => g.name.toLowerCase().includes(term)) : games;

  if (games.length === 0) {
    return <div className="card text-center" style={{ color: "var(--text-secondary)" }}>Nessun gioco venduto.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Venduti" value={String(games.length)} />
        <Stat label="Incassato" value={eur(revenue)} />
        <Stat label="Speso per comprarli" value={eur(spent)} />
        <Stat label={pl >= 0 ? "Guadagno" : "Perdita"} value={signedEur(pl)}
          color={pl >= 0 ? "#4ade80" : "var(--accent-red-light)"} />
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca tra i venduti…" className="w-full pl-8 text-sm" />
      </div>

      {shown.length === 0 ? (
        <div className="card text-center text-sm" style={{ color: "var(--text-muted)" }}>Nessun venduto con questo nome.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((g) => {
            const gain = g.salePrice != null && g.cost != null ? g.salePrice - g.cost : null;
            return (
              <div key={g.id} className="card p-3 flex items-center gap-3">
                {g.thumbnail
                  ? <img src={g.thumbnail} alt="" className="w-12 h-12 object-contain rounded flex-shrink-0" />
                  : <div className="w-12 h-12 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />}
                <div className="flex-1 min-w-0">
                  <Link href={`/collection/${g.id}?from=${encodeURIComponent("/venduti")}`}
                    className="font-semibold truncate block" style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                    {g.name}
                  </Link>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {g.type}{g.saleDate ? ` · venduto il ${formatDayNum(g.saleDate)}` : " · data di vendita non indicata"}
                  </p>
                </div>
                <div className="text-right text-xs flex-shrink-0 tabular-nums space-y-0.5" style={{ color: "var(--text-secondary)" }}>
                  <div>venduto <strong style={{ color: "var(--text-primary)" }}>{g.salePrice != null ? eur(g.salePrice) : "—"}</strong></div>
                  <div>pagato {g.cost != null ? eur(g.cost) : "—"}</div>
                  {gain != null && (
                    <div style={{ color: gain >= 0 ? "#4ade80" : "var(--accent-red-light)" }}>
                      {signedEur(gain)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-3">
      <p className="eyebrow mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-lg font-bold tabular-nums" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
    </div>
  );
}
