interface Props {
  totals: {
    all: number;
    inCollection: number;
    forSale: number;
    preordered: number;
    sold: number;
    wishlist: number;
  };
  finances: {
    totalInvested: number;
    collectionValue: number;
    totalSaleRevenue: number;
    totalProfit: number;
    avgCost: number;
    avgRating: number | null;
    dailySpend: number;
    daysOwned: number;
    startDate: string;
  };
  plays: {
    hIndex: number;
    totalPlays: number;
    gamesPlayed: number;
    nextH: number;
    readyForNext: number;
  };
}

function StatCard({ label, value, sub, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card" style={{ borderLeft: accent ? "3px solid var(--accent-red)" : undefined }}>
      <p className="eyebrow mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

export default function StatCards({ totals, finances, plays }: Props) {
  const profitPositive = finances.totalProfit >= 0;
  // Per salire a H+1 servono H+1 giochi con H+1 partite: quanti ne mancano.
  const missingForNext = Math.max(0, plays.nextH - plays.readyForNext);

  return (
    <div className="space-y-4">
      {/* Conteggi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Totale giochi" value={totals.all} accent />
        <StatCard label="In Collezione" value={totals.inCollection} />
        <StatCard label="In Vendita"    value={totals.forSale} />
        <StatCard label="Preordinati"   value={totals.preordered} />
        <StatCard label="Venduti"       value={totals.sold} />
        <StatCard label="Wishlist"      value={totals.wishlist} />
      </div>

      {/* Partite */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="H-index"
          value={plays.hIndex}
          sub={plays.gamesPlayed === 0
            ? "Nessuna partita registrata"
            : `Ancora ${missingForNext} ${missingForNext === 1 ? "gioco" : "giochi"} a ${plays.nextH}+ partite per arrivare a ${plays.nextH}`}
          accent
        />
        <StatCard
          label="Partite giocate"
          value={plays.totalPlays}
          sub={`${plays.gamesPlayed} giochi diversi`}
        />
      </div>

      {/* Finanze */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Investimento totale"
          value={`€${finances.totalInvested.toFixed(2)}`}
          sub={`Media €${finances.avgCost.toFixed(2)} / gioco`}
          accent
        />
        <StatCard
          label="Valore collezione"
          value={`€${finances.collectionValue.toFixed(2)}`}
          sub="Costo giochi in collezione"
        />
        <StatCard
          label="Ricavi vendite"
          value={`€${finances.totalSaleRevenue.toFixed(2)}`}
          sub={`Su ${totals.sold} giochi venduti`}
        />
        <StatCard
          label="P&L vendite"
          value={`${profitPositive ? "+" : ""}€${finances.totalProfit.toFixed(2)}`}
          sub={profitPositive ? "In profitto" : "In perdita"}
        />
        {finances.avgRating != null && (
          <StatCard
            label="Rating medio BGG"
            value={`★ ${finances.avgRating.toFixed(2)}`}
            sub="Media collezione"
          />
        )}
        <StatCard
          label="Spesa media giornaliera"
          value={`€${finances.dailySpend.toFixed(2)}`}
          sub={`Dal ${finances.startDate} · ${finances.daysOwned} giorni`}
        />
      </div>
    </div>
  );
}
