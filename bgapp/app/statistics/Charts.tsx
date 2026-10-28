"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { eur, num } from "./format";

interface YearData { year: string; purchased: number; sold: number; cost: number; revenue: number }
interface Coverage {
  datedPurchases: number; totalPurchases: number;
  datedSpend: number; totalSpend: number;
  datedSales: number; totalSales: number;
}
interface TopGame { id: number; name: string; cost: number; type: string; status: string }
interface SleeveUsage { id: number; label: string; qty: number; games: number }

interface Props {
  byStatus: { key: string; label: string; value: number }[];
  typeBreakdown: Record<string, number>;
  years: YearData[];
  coverage: Coverage;
  topExpensive: TopGame[];
  topSleeves: SleeveUsage[];
}

function Card({ title, note, className = "", children }: {
  title: string; note?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{title}</h2>
        {note && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{note}</p>}
      </div>
      {children}
    </div>
  );
}

function HBarChart({ data }: { data: { key: string; label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map(({ key, label, value, color }) => (
        <div key={key} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 text-right text-xs truncate" style={{ color: "var(--text-secondary)" }}>{label}</span>
          <div className="flex-1 relative h-5 rounded overflow-hidden" style={{ backgroundColor: "var(--bg-input)" }}>
            <div className="h-full rounded" style={{ width: `${(value / max) * 100}%`, backgroundColor: color,
              minWidth: value > 0 ? "3px" : 0 }} />
          </div>
          <span className="w-10 text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{num(value)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Spesa e incasso su RIGHE separate, ciascuna con la sua cifra: affiancate nella
 * stessa riga sembravano parti di un totale. Tutti gli anni dell'intervallo.
 */
function YearChart({ data }: { data: YearData[] }) {
  if (!data.length) return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessuna data di acquisto o vendita.</p>;
  const max = Math.max(...data.flatMap((d) => [d.cost, d.revenue]), 1);
  const bar = (v: number, color: string, label: string) => (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <div className="flex-1 h-3 rounded overflow-hidden" style={{ backgroundColor: "var(--bg-input)" }}>
        <div className="h-full rounded" style={{ width: `${(v / max) * 100}%`, backgroundColor: color, minWidth: v > 0 ? "3px" : 0 }} />
      </div>
      <span className="w-24 shrink-0 text-right text-xs tabular-nums" style={{ color: "var(--text-primary)" }}>{eur(v)}</span>
    </div>
  );
  return (
    <div className="space-y-4">
      {data.map((d) => (
        <div key={d.year} className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{d.year}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {num(d.purchased)} {d.purchased === 1 ? "acquisto" : "acquisti"} · {num(d.sold)} {d.sold === 1 ? "venduto" : "venduti"}
            </span>
          </div>
          {bar(d.cost, "var(--accent-blue-light)", "Spesa")}
          {bar(d.revenue, "var(--accent-red)", "Incasso")}
        </div>
      ))}
    </div>
  );
}

const HASH_PALETTE = ["#2f6f4f", "#8a6d3b", "#5c3a5d", "#3a5d6f", "#6f3a3a", "#4a5d3a"];
function statusColor(key: string) {
  const map: Record<string, string> = {
    InCollezione: "var(--accent-blue-light)",
    InVendita: "#b8860b",
    Preordinato: "#7b4fa6",
    Venduto: "var(--accent-red)",
    GiocatoEsterno: "var(--text-muted)",
    Altri: "var(--text-muted)",
  };
  if (map[key]) return map[key];
  // Custom statuses (configurable) get a stable, distinct colour instead of grey.
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 997;
  return HASH_PALETTE[h % HASH_PALETTE.length];
}

export default function Charts({ byStatus, typeBreakdown, years, coverage: cv, topExpensive, topSleeves }: Props) {
  const fullPurchases = cv.datedPurchases === cv.totalPurchases;
  const fullSales = cv.datedSales === cv.totalSales;
  const yearNote = fullPurchases && fullSales
    ? "Tutti gli acquisti e le vendite hanno una data."
    : `Conta solo ciò che ha una data: ${num(cv.datedPurchases)} acquisti su ${num(cv.totalPurchases)} `
      + `(${eur(cv.datedSpend)} dei ${eur(cv.totalSpend)} spesi) e ${num(cv.datedSales)} vendite su ${num(cv.totalSales)}. `
      + "Il resto non compare qui.";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Distribuzione per stato" note="Tutti i giochi registrati, venduti compresi.">
        <HBarChart data={byStatus.map((s) => ({ ...s, color: statusColor(s.key) }))} />
      </Card>

      <Card title="Tipi di gioco" note="Solo i giochi in casa.">
        <HBarChart data={Object.entries(typeBreakdown).map(([label, value]) => ({
          key: label, label, value, color: "var(--accent-red)" }))} />
      </Card>

      <Card title="Acquisti e vendite per anno" note={yearNote} className="lg:col-span-2">
        <YearChart data={years} />
      </Card>

      <Card title="I 10 giochi più costosi" note="Solo i giochi in casa." className="lg:col-span-2">
        {topExpensive.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aggiungi i costi di acquisto per vedere questa sezione.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Gioco</th>
                  <th className="hidden sm:table-cell">Tipo</th>
                  <th className="text-right">Costo</th>
                  <th className="hidden sm:table-cell">Stato</th>
                </tr>
              </thead>
              <tbody>
                {topExpensive.map((g, i) => (
                  <tr key={g.id}>
                    <td className="text-sm tabular-nums" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td className="font-medium text-sm">
                      <Link href={`/collection/${g.id}?from=${encodeURIComponent("/statistics")}`}
                        style={{ color: "var(--text-primary)", textDecoration: "none" }}>{g.name}</Link>
                    </td>
                    <td className="hidden sm:table-cell text-sm" style={{ color: "var(--text-secondary)" }}>{g.type}</td>
                    <td className="text-right text-sm tabular-nums whitespace-nowrap">{eur(g.cost)}</td>
                    <td className="hidden sm:table-cell"><StatusBadge status={g.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {topSleeves.length > 0 && (
        <Card title="Bustine più usate" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Formato</th>
                  <th className="text-right">Pezzi assegnati</th>
                  <th className="text-right">Giochi</th>
                </tr>
              </thead>
              <tbody>
                {topSleeves.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium text-sm">{s.label}</td>
                    <td className="text-right text-sm tabular-nums">{num(s.qty)}</td>
                    <td className="text-right text-sm tabular-nums">{num(s.games)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
