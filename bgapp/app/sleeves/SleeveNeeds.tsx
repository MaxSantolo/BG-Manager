import type { NeedRow } from "@/lib/cardSizes";

/** Lista della spesa delle bustine, dalle carte caricate da BGG nelle schede dei giochi. */
export default function SleeveNeeds({ rows, unmatched, loaded, noCards, total }: {
  rows: NeedRow[]; unmatched: { size: string; cards: number; games: string[] }[];
  loaded: number; noCards: number; total: number;
}) {
  const names = (gs: string[]) => gs.length <= 3 ? gs.join(", ") : `${gs.slice(0, 3).join(", ")} e altri ${gs.length - 3}`;
  return (
    <div className="card space-y-3">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Da imbustare</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Conta i giochi in casa di cui hai caricato le carte da BGG ({loaded} su {total}
          {noCards > 0 ? `, di cui ${noCards} senza carte` : ""}): si caricano dalla scheda del gioco, tasto «Carica da BGG».
        </p>
      </div>
      {rows.length === 0 && unmatched.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ancora nessuna carta caricata.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Formato</th>
                <th className="text-right">Carte</th>
                <th className="text-right">Imbustate</th>
                <th className="text-right">Da fare</th>
                <th className="text-right">Scorta</th>
                <th className="text-right">Da comprare</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.format.id}>
                  <td className="text-sm">
                    <span className="font-mono font-semibold">{r.format.label || r.format.size}</span>
                    {r.games.length > 0 && <span className="block text-xs" style={{ color: "var(--text-muted)" }}>{names(r.games)}</span>}
                  </td>
                  <td className="text-right text-sm tabular-nums">{r.cards}</td>
                  <td className="text-right text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>{r.sleeved}</td>
                  <td className="text-right text-sm tabular-nums">{r.todo}</td>
                  <td className="text-right text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>{r.format.quantity}</td>
                  <td className="text-right text-sm tabular-nums font-semibold"
                    style={{ color: r.buy > 0 ? "var(--accent-red-light)" : "var(--text-muted)" }}>{r.buy > 0 ? r.buy : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {unmatched.length > 0 && (
        <div className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
          <p style={{ color: "var(--accent-red-light)" }}>Misure senza un formato in magazzino (aggiungilo con «Aggiungi bustina»):</p>
          {unmatched.map((u) => <p key={u.size}><span className="font-mono">{u.size}</span> · {u.cards} carte · {names(u.games)}</p>)}
        </div>
      )}
    </div>
  );
}
