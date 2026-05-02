"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface Sleeve {
  id: number;
  size: string;
  label: string | null;
  quantity: number;
}

interface Usage {
  qty: number;
  games: number;
}

export default function SleevesList({
  sleeves,
  usageMap,
}: {
  sleeves: Sleeve[];
  usageMap: Record<number, Usage>;
}) {
  const [search, setSearch] = useState("");

  const filtered = sleeves.filter((s) => {
    const q = search.toLowerCase();
    return s.size.toLowerCase().includes(q) || (s.label ?? "").toLowerCase().includes(q);
  });

  const displayName = (s: Sleeve) => s.label || s.size;

  return (
    <div className="space-y-3">
      {/* Filters */}
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
          filtered.map((sleeve) => {
            const usage = usageMap[sleeve.id];
            return (
              <div key={sleeve.id} className="card flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">{displayName(sleeve)}</div>
                  {sleeve.label && (
                    <div className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{sleeve.size}</div>
                  )}
                  <div className="flex gap-3 text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    <span>Disponibili: <span className="font-mono font-semibold">{sleeve.quantity}</span></span>
                    {usage && <span>Usate: <span className="font-mono font-semibold">{usage.qty}</span> ({usage.games} giochi)</span>}
                  </div>
                </div>
                <Link href={`/sleeves/${sleeve.id}`} className="btn-ghost">Modifica</Link>
              </div>
            );
          })
        )}
      </div>

      {/* Tablet: grid 2 colonne */}
      <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-8" style={{ color: "var(--text-muted)" }}>Nessuna bustina trovata.</div>
        ) : (
          filtered.map((sleeve) => {
            const usage = usageMap[sleeve.id];
            return (
              <div key={sleeve.id} className="card flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">{displayName(sleeve)}</div>
                  {sleeve.label && (
                    <div className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{sleeve.size}</div>
                  )}
                  <div className="flex gap-3 text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    <span>Disp.: <span className="font-mono font-semibold">{sleeve.quantity}</span></span>
                    {usage && <span>Usate: <span className="font-mono font-semibold">{usage.qty}</span></span>}
                  </div>
                </div>
                <Link href={`/sleeves/${sleeve.id}`} className="btn-ghost">Modifica</Link>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop: tabella */}
      <div className="card p-0 overflow-x-auto hidden lg:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Dimensione</th>
              <th className="text-right">Disponibili</th>
              <th className="text-right">Usate</th>
              <th className="text-right">Giochi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                  Nessuna bustina trovata.
                </td>
              </tr>
            )}
            {filtered.map((sleeve) => {
              const usage = usageMap[sleeve.id];
              return (
                <tr key={sleeve.id}>
                  <td className="font-medium">{displayName(sleeve)}</td>
                  <td className="font-mono text-sm" style={{ color: "var(--text-secondary)" }}>{sleeve.size}</td>
                  <td className="text-right font-mono text-sm">{sleeve.quantity}</td>
                  <td className="text-right font-mono text-sm" style={{ color: usage ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {usage ? usage.qty : "—"}
                  </td>
                  <td className="text-right font-mono text-sm" style={{ color: usage ? "var(--text-secondary)" : "var(--text-muted)" }}>
                    {usage ? usage.games : "—"}
                  </td>
                  <td>
                    <Link href={`/sleeves/${sleeve.id}`} className="btn-ghost">Modifica</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
        {filtered.length} bustine{search ? " trovate" : " totali"}
      </div>
    </div>
  );
}
