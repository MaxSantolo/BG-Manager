"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus } from "lucide-react";

interface Sleeve {
  id: number;
  size: string;
  label: string | null;
  quantity: number;
}

export default function SleevesList({ sleeves }: { sleeves: Sleeve[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = sleeves.filter((s) => {
    const q = search.toLowerCase();
    return s.size.toLowerCase().includes(q) || (s.label ?? "").toLowerCase().includes(q);
  });

  const displayName = (s: Sleeve) => s.label || s.size;

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap gap-3 items-center py-3">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per dimensione o etichetta…"
            className="w-full pl-8 text-sm"
          />
        </div>
      </div>

      {/* Mobile: card */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>Nessuna bustina trovata.</div>
        ) : (
          filtered.map((sleeve) => (
            <div key={sleeve.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{displayName(sleeve)}</div>
                  {sleeve.label && (
                    <div className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{sleeve.size}</div>
                  )}
                  <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    A magazzino: <span className="font-mono font-semibold">{sleeve.quantity}</span>
                  </div>
                </div>
                <Link href={`/sleeves/${sleeve.id}`} className="btn-ghost">Modifica</Link>
              </div>
              <RestockRow sleeveId={sleeve.id} onDone={() => router.refresh()} />
            </div>
          ))
        )}
      </div>

      {/* Tablet: grid 2 colonne */}
      <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-8" style={{ color: "var(--text-muted)" }}>Nessuna bustina trovata.</div>
        ) : (
          filtered.map((sleeve) => (
            <div key={sleeve.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{displayName(sleeve)}</div>
                  {sleeve.label && (
                    <div className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{sleeve.size}</div>
                  )}
                  <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    A magazzino: <span className="font-mono font-semibold">{sleeve.quantity}</span>
                  </div>
                </div>
                <Link href={`/sleeves/${sleeve.id}`} className="btn-ghost">Modifica</Link>
              </div>
              <RestockRow sleeveId={sleeve.id} onDone={() => router.refresh()} />
            </div>
          ))
        )}
      </div>

      {/* Desktop: tabella */}
      <div className="card p-0 overflow-x-auto hidden lg:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Dimensione</th>
              <th className="text-right">A magazzino</th>
              <th>Aggiungi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                  Nessuna bustina trovata.
                </td>
              </tr>
            )}
            {filtered.map((sleeve) => (
              <tr key={sleeve.id}>
                <td className="font-medium">{displayName(sleeve)}</td>
                <td className="font-mono text-sm" style={{ color: "var(--text-secondary)" }}>{sleeve.size}</td>
                <td className="text-right font-mono text-sm">{sleeve.quantity}</td>
                <td>
                  <RestockRow sleeveId={sleeve.id} onDone={() => router.refresh()} compact />
                </td>
                <td>
                  <Link href={`/sleeves/${sleeve.id}`} className="btn-ghost">Modifica</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
        {filtered.length} bustine{search ? " trovate" : " totali"}
      </div>
    </div>
  );
}

function RestockRow({ sleeveId, onDone, compact }: { sleeveId: number; onDone: () => void; compact?: boolean }) {
  const [n, setN] = useState("1");
  const [busy, setBusy] = useState(false);

  async function add() {
    const delta = parseInt(n);
    if (!Number.isFinite(delta) || delta === 0) return;
    setBusy(true);
    const res = await fetch(`/api/sleeves/${sleeveId}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    setBusy(false);
    if (res.ok) { setN("1"); onDone(); }
  }

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "mt-1"}`}>
      <input
        type="number"
        value={n}
        onChange={(e) => setN(e.target.value)}
        className="w-16 text-sm"
        disabled={busy}
      />
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="btn-secondary text-xs flex items-center gap-1 px-2 py-1"
      >
        <Plus size={12} /> Aggiungi
      </button>
    </div>
  );
}
