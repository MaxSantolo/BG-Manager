"use client";

interface YearData {
  year: string;
  purchased: number;
  sold: number;
  cost: number;
  revenue: number;
}

interface TopGame {
  name: string;
  cost: number;
  salePrice: number | null;
  status: string;
}

interface SleeveUsage {
  label: string;
  qty: number;
  games: number;
}

interface Props {
  byStatus: Record<string, number>;
  typeBreakdown: Record<string, number>;
  costByYear: YearData[];
  topExpensive: TopGame[];
  topSleeves: SleeveUsage[];
}

function HBarChart({
  data,
  colorFn,
}: {
  data: { label: string; value: number }[];
  colorFn?: (label: string) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
            {label}
          </span>
          <div className="flex-1 relative h-5 rounded overflow-hidden" style={{ backgroundColor: "var(--bg-input)" }}>
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(value / max) * 100}%`,
                backgroundColor: colorFn ? colorFn(label) : "var(--accent-red)",
              }}
            />
          </div>
          <span className="w-8 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function YearBarChart({ data }: { data: YearData[] }) {
  if (!data.length) return <p style={{ color: "var(--text-muted)" }} className="text-sm">Nessun dato disponibile (aggiungi date di acquisto)</p>;

  const maxCost = Math.max(...data.map((d) => d.cost), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.year} className="space-y-1">
          <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
            <span className="font-semibold">{d.year}</span>
            <span>{d.purchased} acquisti · {d.sold} venduti · €{d.cost.toFixed(0)} spesi · €{d.revenue.toFixed(0)} incassati</span>
          </div>
          <div className="flex gap-1 h-4">
            <div
              className="rounded"
              style={{
                width: `${(d.cost / maxCost) * 100}%`,
                backgroundColor: "var(--accent-blue-light)",
                minWidth: d.cost > 0 ? "4px" : "0",
              }}
            />
            <div
              className="rounded"
              style={{
                width: `${(d.revenue / maxCost) * 100}%`,
                backgroundColor: "var(--accent-red)",
                minWidth: d.revenue > 0 ? "4px" : "0",
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex gap-4 text-xs pt-1" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded" style={{ backgroundColor: "var(--accent-blue-light)" }} /> Spesa
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded" style={{ backgroundColor: "var(--accent-red)" }} /> Incasso
        </span>
      </div>
    </div>
  );
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    InCollezione: "var(--accent-blue-light)",
    InVendita: "#b8860b",
    Preordinato: "#7b4fa6",
    Venduto: "var(--accent-red)",
    "In Collezione": "var(--accent-blue-light)",
    "In Vendita": "#b8860b",
  };
  return map[status] ?? "var(--text-muted)";
}

export default function Charts({ byStatus, typeBreakdown, costByYear, topExpensive, topSleeves }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* By Status */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Distribuzione per Stato
        </h2>
        <HBarChart
          data={Object.entries(byStatus).map(([label, value]) => ({ label, value }))}
          colorFn={statusColor}
        />
      </div>

      {/* By Type */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Distribuzione per Tipo
        </h2>
        <HBarChart
          data={Object.entries(typeBreakdown).map(([label, value]) => ({ label, value }))}
        />
      </div>

      {/* Cost by Year */}
      <div className="card space-y-3 lg:col-span-2">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Acquisti & Vendite per Anno
        </h2>
        <YearBarChart data={costByYear} />
      </div>

      {/* Top Sleeves */}
      {topSleeves.length > 0 && (
        <div className="card space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Bustine più usate
          </h2>
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
                  <tr key={s.label}>
                    <td className="font-medium text-sm">{s.label}</td>
                    <td className="text-right text-sm font-mono">{s.qty}</td>
                    <td className="text-right text-sm font-mono">{s.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Expensive */}
      <div className="card space-y-3 lg:col-span-2">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Top 10 Giochi per Costo
        </h2>
        {topExpensive.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Aggiungi i costi di acquisto per visualizzare questa sezione</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th className="text-right">Costo</th>
                  <th className="text-right">Vendita</th>
                  <th className="text-right">P&L</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {topExpensive.map((g, i) => {
                  const pl = g.salePrice != null ? g.salePrice - g.cost : null;
                  return (
                    <tr key={g.name + i}>
                      <td className="text-sm" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td className="font-medium text-sm">{g.name}</td>
                      <td className="text-right text-sm">€{g.cost.toFixed(2)}</td>
                      <td className="text-right text-sm">
                        {g.salePrice != null ? `€${g.salePrice.toFixed(2)}` : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td className="text-right text-sm">
                        {pl != null ? (
                          <span style={{ color: pl >= 0 ? "#4ade80" : "var(--accent-red-light)" }}>
                            {pl >= 0 ? "+" : ""}€{pl.toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge text-xs"
                          style={{
                            backgroundColor: statusColor(g.status) + "33",
                            color: statusColor(g.status),
                          }}
                        >
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
