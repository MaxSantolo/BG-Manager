import Link from "next/link";
import { eur, signedEur, num, dec } from "./format";

interface Props {
  collection: {
    total: number;       // in casa + preordinati
    inHouse: number;     // = Collezione
    forSale: number;
    preordered: number;
    sold: number;
    wishlist: number;
    avgRating: number | null;
    ratedCount: number;
  };
  plays: {
    hIndex: number;
    totalPlays: number;
    gamesPlayed: number;
    nextH: number;
    readyForNext: number;
    neverPlayed: number;
  };
  money: {
    totalInvested: number;
    avgCost: number;
    collectionValue: number;
    totalSaleRevenue: number;
    totalProfit: number;
    soldCount: number;
    dailySpend: number;
    daysOwned: number;
    startDate: string;
  };
}

function StatCard({ label, value, sub, accent, color, href }: {
  label: string; value: string; sub?: string; accent?: boolean; color?: string; href?: string;
}) {
  const body = (
    <div className="card h-full" style={{ borderLeft: accent ? "3px solid var(--accent-red)" : undefined }}>
      <p className="eyebrow mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
  // le card che hanno una pagina dedicata ci portano
  return href ? <Link href={href} className="block hover:brightness-110 transition" style={{ textDecoration: "none" }}>{body}</Link> : body;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{title}</h2>
      {children}
    </section>
  );
}

export default function StatCards({ collection: c, plays: p, money: m }: Props) {
  const missingForNext = Math.max(0, p.nextH - p.readyForNext);

  return (
    <div className="space-y-8">
      <Section title="Collezione">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Totale giochi" value={num(c.total)} sub="in casa + preordinati" accent />
          <StatCard label="In casa" value={num(c.inHouse)}
            sub={c.forSale > 0 ? `di cui ${num(c.forSale)} in vendita` : "la tua Collezione"} href="/collection" />
          <StatCard label="Preordinati" value={num(c.preordered)} sub="in arrivo" href="/preordini" />
          <StatCard label="Venduti" value={num(c.sold)} sub="non contano nel totale" href="/venduti" />
          <StatCard label="Desiderata" value={num(c.wishlist)} href="/wishlist" />
          <StatCard label="Rating medio BGG"
            value={c.avgRating != null ? `★ ${dec(c.avgRating)}` : "—"}
            sub={`sui ${num(c.ratedCount)} giochi in casa con rating`} />
        </div>
      </Section>

      <Section title="Partite">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="H-index" value={num(p.hIndex)} accent
            sub={p.gamesPlayed === 0
              ? "Nessuna partita registrata"
              : `Ancora ${num(missingForNext)} ${missingForNext === 1 ? "gioco" : "giochi"} a ${p.nextH}+ partite per arrivare a ${p.nextH}`} />
          <StatCard label="Partite giocate" value={num(p.totalPlays)} sub={`${num(p.gamesPlayed)} giochi diversi`} href="/plays" />
          <StatCard label="Mai giocati" value={num(p.neverPlayed)} sub="giochi in casa senza partite" href="/mai-giocati" />
        </div>
      </Section>

      <Section title="Soldi">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard label="Speso in tutto" value={eur(m.totalInvested)} sub={`media ${eur(m.avgCost)} a gioco`} accent />
          <StatCard label="Valore in casa" value={eur(m.collectionValue)} sub="quanto sono costati i giochi in casa" />
          <StatCard label="Incassato" value={eur(m.totalSaleRevenue)} sub={`da ${num(m.soldCount)} giochi venduti`} href="/venduti" />
          <StatCard label={m.totalProfit >= 0 ? "Guadagno vendite" : "Perdita vendite"} value={signedEur(m.totalProfit)}
            color={m.totalProfit >= 0 ? "#4ade80" : "var(--accent-red-light)"} sub="incassato meno quanto li avevi pagati" />
          <StatCard label="Spesa al giorno" value={eur(m.dailySpend)} sub={`dal ${m.startDate} · ${num(m.daysOwned)} giorni`} />
        </div>
      </Section>
    </div>
  );
}
