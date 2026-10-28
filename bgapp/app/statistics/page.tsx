import { prisma } from "@/lib/prisma";
import { formatDayNum } from "@/lib/dates";
import { parseStatusConfig, labelFor, OUT_OF_COLLECTION } from "@/lib/status";
import { findNeverPlayed } from "@/lib/neverPlayed";
import StatCards from "./StatCards";
import Charts from "./Charts";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const [allGames, wishlistCount, sleeveUsageRaw, firstPlay, settings, plays, neverPlayed] = await Promise.all([
    prisma.game.findMany(),
    prisma.wishlistGame.count(),
    prisma.gameSleeve.groupBy({
      by: ["sleeveId"],
      _sum: { qty: true },
      _count: { gameId: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 10,
    }),
    prisma.play.aggregate({ _min: { date: true } }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { statusConfig: true } }),
    prisma.play.findMany({ select: { gameId: true, bggGameId: true, gameName: true, quantity: true } }),
    findNeverPlayed(),
  ]);

  const statusConfig = parseStatusConfig(settings?.statusConfig);

  // Tre insiemi, con le stesse regole delle altre pagine:
  //  - in casa  = la Collezione (esclusi venduti, preordinati, ospite);
  //  - tuoi     = in casa + preordinati (il "Totale giochi", come la dashboard);
  //  - tutto lo storico = anche i venduti, per i conti dei soldi.
  const inHouse    = allGames.filter((g) => !OUT_OF_COLLECTION.includes(g.status));
  const owned      = allGames.filter((g) => g.status !== "Venduto" && g.status !== "GiocatoEsterno");
  const forSale    = allGames.filter((g) => g.status === "InVendita");
  const preordered = allGames.filter((g) => g.status === "Preordinato");
  const sold       = allGames.filter((g) => g.status === "Venduto");
  const bought     = allGames.filter((g) => g.status !== "GiocatoEsterno"); // i giochi da ospite non sono acquisti

  // Soldi: su tutto lo storico.
  const totalInvested    = bought.reduce((s, g) => s + (g.cost ?? 0), 0);
  const withCost         = bought.filter((g) => g.cost);
  const avgCost          = withCost.length > 0 ? totalInvested / withCost.length : 0;
  const collectionValue  = inHouse.reduce((s, g) => s + (g.cost ?? 0), 0);
  const totalSaleRevenue = sold.reduce((s, g) => s + (g.salePrice ?? 0), 0);
  const totalProfit      = totalSaleRevenue - sold.reduce((s, g) => s + (g.cost ?? 0), 0);

  // Collezione: solo i giochi in casa.
  const rated     = inHouse.filter((g) => g.bggRating != null);
  const avgRating = rated.length > 0 ? rated.reduce((s, g) => s + (g.bggRating ?? 0), 0) / rated.length : null;

  // Spesa media giornaliera = totale speso / giorni di attività.
  // purchaseDate è quasi sempre vuota, quindi come inizio uso la data più antica
  // tra il primo acquisto registrato e la prima partita giocata (segnale di attività reale).
  const startCandidates = [...allGames.map((g) => g.purchaseDate), firstPlay._min.date]
    .filter((d): d is Date => d != null)
    .map((d) => new Date(d).getTime());
  const collectionStart = startCandidates.length > 0 ? new Date(Math.min(...startCandidates)) : new Date();
  const daysOwned       = Math.max(1, Math.floor((Date.now() - collectionStart.getTime()) / 86_400_000));
  const dailySpend      = totalInvested / daysOwned;

  const hIndex = buildHIndex(plays, allGames);

  const typeBreakdown = inHouse.reduce(
    (acc, g) => { acc[g.type] = (acc[g.type] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  // Bucket by the CONFIGURED statuses (not the 4 hardcoded built-ins), so
  // GiocatoEsterno and any custom status are counted and the chart reconciles
  // with the total. Anything not in the config lands in "Altri".
  const statusCounts = new Map<string, number>();
  for (const g of allGames) statusCounts.set(g.status, (statusCounts.get(g.status) ?? 0) + 1);
  const byStatus: { key: string; label: string; value: number }[] = [];
  for (const s of statusConfig) {
    const n = statusCounts.get(s.key) ?? 0;
    if (n > 0) byStatus.push({ key: s.key, label: labelFor(statusConfig, s.key), value: n });
    statusCounts.delete(s.key);
  }
  const altri = [...statusCounts.values()].reduce((a, b) => a + b, 0);
  if (altri > 0) byStatus.push({ key: "Altri", label: "Altri", value: altri });

  const years = buildCostByYear(bought);
  const coverage = {
    datedPurchases: bought.filter((g) => g.purchaseDate).length,
    totalPurchases: bought.length,
    datedSpend:     bought.filter((g) => g.purchaseDate).reduce((s, g) => s + (g.cost ?? 0), 0),
    totalSpend:     totalInvested,
    datedSales:     sold.filter((g) => g.saleDate).length,
    totalSales:     sold.length,
  };

  // Top 10 per costo, fra i giochi in casa.
  const topExpensive = inHouse
    .filter((g) => g.cost)
    .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
    .slice(0, 10)
    .map((g) => ({ id: g.id, name: g.name, cost: g.cost ?? 0, type: g.type, status: g.status }));

  // Bustine: chiave per id. Due bustine con lo stesso formato e senza etichetta
  // avevano lo stesso nome a schermo (e la stessa chiave React: righe che
  // sparivano o si duplicavano): le distingue la scorta.
  const sleeveIds = sleeveUsageRaw.map((s) => s.sleeveId);
  const sleeves = sleeveIds.length > 0 ? await prisma.sleeve.findMany({ where: { id: { in: sleeveIds } } }) : [];
  const byId = new Map(sleeves.map((s) => [s.id, s]));
  const baseName = (id: number) => { const s = byId.get(id); return s ? (s.label || s.size) : `#${id}`; };
  const nameCount = new Map<string, number>();
  for (const s of sleeveUsageRaw) nameCount.set(baseName(s.sleeveId), (nameCount.get(baseName(s.sleeveId)) ?? 0) + 1);
  const topSleeves = sleeveUsageRaw.map((s) => {
    const name = baseName(s.sleeveId);
    const stock = byId.get(s.sleeveId)?.quantity;
    return {
      id:    s.sleeveId,
      label: (nameCount.get(name) ?? 0) > 1 && stock != null ? `${name} · scorta ${stock}` : name,
      qty:   s._sum.qty ?? 0,
      games: s._count.gameId,
    };
  });

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Statistiche</h1>

      <StatCards
        collection={{
          total: owned.length,
          inHouse: inHouse.length,
          forSale: forSale.length,
          preordered: preordered.length,
          sold: sold.length,
          wishlist: wishlistCount,
          avgRating: avgRating != null ? round2(avgRating) : null,
          ratedCount: rated.length,
        }}
        plays={{ ...hIndex, neverPlayed: neverPlayed.length }}
        money={{
          totalInvested:    round2(totalInvested),
          avgCost:          round2(avgCost),
          collectionValue:  round2(collectionValue),
          totalSaleRevenue: round2(totalSaleRevenue),
          totalProfit:      round2(totalProfit),
          soldCount:        sold.length,
          dailySpend:       round2(dailySpend),
          daysOwned,
          startDate:        formatDayNum(collectionStart),
        }}
      />

      <Charts
        byStatus={byStatus}
        typeBreakdown={typeBreakdown}
        years={years}
        coverage={coverage}
        topExpensive={topExpensive}
        topSleeves={topSleeves}
      />
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * H-index alla BoardGameGeek: il numero H piu' alto per cui esistono almeno H
 * giochi giocati almeno H volte ciascuno. Misura l'ampiezza di una collezione
 * davvero giocata, non quanto e' grande: comprare non lo alza, rigiocare si'.
 *
 * Due dettagli che cambiano il risultato:
 *  - una riga Play puo' valere piu' partite (quantity), ed e' cosi' che le
 *    conta BGG;
 *  - una partita punta al gioco per gameId OPPURE, quando il sync non l'ha
 *    risolto, solo per bggGameId o per nome (30 righe su 337). Contarle come
 *    giochi diversi spezzerebbe in due lo storico di un gioco e abbasserebbe
 *    l'indice, quindi bggGameId viene ricondotto al gioco locale quando esiste.
 */
function buildHIndex(
  plays: { gameId: number | null; bggGameId: number | null; gameName: string; quantity: number }[],
  games: { id: number; bggId: number | null }[],
) {
  const gameIdByBggId = new Map<number, number>();
  for (const g of games) if (g.bggId != null) gameIdByBggId.set(g.bggId, g.id);

  const countByGame = new Map<string, number>();
  for (const p of plays) {
    const key =
      p.gameId != null                              ? `g:${p.gameId}` :
      p.bggGameId != null                           ? `g:${gameIdByBggId.get(p.bggGameId) ?? `b:${p.bggGameId}`}` :
      `n:${p.gameName.trim().toLowerCase()}`;
    countByGame.set(key, (countByGame.get(key) ?? 0) + Math.max(1, p.quantity));
  }

  const counts = [...countByGame.values()].sort((a, b) => b - a);
  let h = 0;
  while (h < counts.length && counts[h] >= h + 1) h++;

  // Quanto manca al gradino dopo: per H+1 servono H+1 giochi con H+1 partite.
  const readyForNext = counts.filter((c) => c >= h + 1).length;

  return {
    hIndex: h,
    totalPlays: counts.reduce((a, b) => a + b, 0),
    gamesPlayed: counts.length,
    nextH: h + 1,
    readyForNext,
  };
}

function buildCostByYear(games: { status: string; purchaseDate: Date | null; cost: number | null; saleDate: Date | null; salePrice: number | null }[]) {
  const byYear: Record<string, { purchased: number; sold: number; cost: number; revenue: number }> = {};
  for (const g of games) {
    if (g.purchaseDate) {
      const y = String(new Date(g.purchaseDate).getUTCFullYear());
      if (!byYear[y]) byYear[y] = { purchased: 0, sold: 0, cost: 0, revenue: 0 };
      byYear[y].purchased++;
      byYear[y].cost += g.cost ?? 0;
    }
    // Una vendita è un gioco VENDUTO con la sua data: una data di vendita rimasta
    // su un gioco ancora in casa (è successo: Algae, Recall) non è una vendita.
    if (g.saleDate && g.status === "Venduto") {
      const y = String(new Date(g.saleDate).getUTCFullYear());
      if (!byYear[y]) byYear[y] = { purchased: 0, sold: 0, cost: 0, revenue: 0 };
      byYear[y].sold++;
      byYear[y].revenue += g.salePrice ?? 0;
    }
  }
  // Tutti gli anni dell'intervallo, anche quelli senza movimenti: un anno che
  // manca nel grafico sembra un buco nei dati invece che un anno vuoto.
  const ys = Object.keys(byYear).map(Number);
  if (ys.length === 0) return [];
  const out = [];
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    out.push({ year: String(y), ...(byYear[String(y)] ?? { purchased: 0, sold: 0, cost: 0, revenue: 0 }) });
  }
  return out;
}
