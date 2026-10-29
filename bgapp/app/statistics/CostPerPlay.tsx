import Link from "next/link";
import { eur, num } from "./format";

interface Item { id: number; name: string; thumbnail: string | null; cost: number; plays: number; perPlay: number | null }

interface Props {
  best: Item[]; worst: Item[]; unplayed: Item[];
  unplayedCount: number; unplayedSpend: number;
  avgPerPlay: number | null; playedCount: number;
}

function List({ title, note, items, value, empty }: {
  title: string; note: string; items: Item[]; value: (g: Item) => React.ReactNode; empty: string;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <div>
        <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{note}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{empty}</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((g) => (
            <li key={g.id}>
              <Link href={`/collection/${g.id}?from=${encodeURIComponent("/statistics")}`}
                className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
                {g.thumbnail
                  ? <img src={g.thumbnail} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                  : <span className="w-8 h-8 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate" style={{ color: "var(--text-primary)" }}>{g.name}</span>
                  <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                    {eur(g.cost)}{g.plays > 0 && ` · ${num(g.plays)} ${g.plays === 1 ? "partita" : "partite"}`}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums whitespace-nowrap">{value(g)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Prezzo diviso partite: cosa si è ripagato, cosa no, cosa aspetta ancora sullo scaffale. */
export default function CostPerPlay({ best, worst, unplayed, unplayedCount, unplayedSpend, avgPerPlay, playedCount }: Props) {
  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Quanto ti costa ogni partita</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Prezzo diviso partite giocate. Solo giochi in casa con un prezzo, espansioni escluse: si giocano dentro il gioco base.
            Quelli segnati come giocati prima del registro non hanno partite da dividere e restano fuori.
          </p>
        </div>
        {avgPerPlay != null && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            In media <strong className="text-sm" style={{ color: "var(--text-primary)" }}>{eur(avgPerPlay)}</strong> a partita
            su {num(playedCount)} giochi giocati
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <List title="Si sono ripagati" note="Il costo a partita più basso." items={best}
          value={(g) => <span style={{ color: "var(--accent-blue-light)" }}>{eur(g.perPlay!)}</span>}
          empty="Nessun gioco con prezzo e partite." />
        <List title="I più cari a partita" note="Giocati, ma poco per quanto sono costati." items={worst}
          value={(g) => <span style={{ color: "var(--accent-red-light)" }}>{eur(g.perPlay!)}</span>}
          empty="Nessun gioco con prezzo e partite." />
        <List title="Pagati e mai giocati"
          note={unplayedCount > 0 ? `${num(unplayedCount)} giochi, ${eur(unplayedSpend)} fermi sullo scaffale.` : "Nessuno: li hai giocati tutti."}
          items={unplayed}
          value={(g) => <span style={{ color: "var(--text-secondary)" }}>{eur(g.cost)}</span>}
          empty="" />
      </div>
      {unplayedCount > unplayed.length && (
        <Link href="/mai-giocati" className="btn-ghost text-xs inline-flex">Tutti i {num(unplayedCount)} mai giocati →</Link>
      )}
    </div>
  );
}
