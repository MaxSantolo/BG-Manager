import { prisma } from "@/lib/prisma";
import { parseStatusConfig, labelFor } from "@/lib/status";
import StatCards from "./StatCards";
import Charts from "./Charts";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const [allGames, wishlistCount, sleeveUsageRaw, firstPlay, settings] = await Promise.all([
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
  ]);

  const statusConfig = parseStatusConfig(settings?.statusConfig);

  const inCollection = allGames.filter((g) => g.status === "InCollezione");
  const forSale      = allGames.filter((g) => g.status === "InVendita");
  const preordered   = allGames.filter((g) => g.status === "Preordinato");
  const sold         = allGames.filter((g) => g.status === "Venduto");

  const totalInvested     = allGames.reduce((s, g) => s + (g.cost ?? 0), 0);
  const collectionValue   = inCollection.reduce((s, g) => s + (g.cost ?? 0), 0);
  const totalSaleRevenue  = sold.reduce((s, g) => s + (g.salePrice ?? 0), 0);
  const totalSoldCost     = sold.reduce((s, g) => s + (g.cost ?? 0), 0);
  const totalProfit       = totalSaleRevenue - totalSoldCost;
  const gamesWithCost     = allGames.filter((g) => g.cost);
  const avgCost           = gamesWithCost.length > 0 ? totalInvested / gamesWithCost.length : 0;
  const gamesWithRating   = allGames.filter((g) => g.bggRating != null);
  const avgRating         = gamesWithRating.length > 0
    ? gamesWithRating.reduce((s, g) => s + (g.bggRating ?? 0), 0) / gamesWithRating.length
    : null;

  // Spesa media giornaliera = totale speso / giorni di attività.
  // purchaseDate è quasi sempre vuota, quindi come inizio uso la data più antica
  // tra il primo acquisto registrato e la prima partita giocata (segnale di attività reale).
  const startCandidates   = [
    ...allGames.map((g) => g.purchaseDate),
    firstPlay._min.date,
  ]
    .filter((d): d is Date => d != null)
    .map((d) => new Date(d).getTime());
  const collectionStart   = startCandidates.length > 0 ? new Date(Math.min(...startCandidates)) : new Date();
  const daysOwned         = Math.max(1, Math.floor((Date.now() - collectionStart.getTime()) / 86_400_000));
  const dailySpend        = totalInvested / daysOwned;

  const typeBreakdown = allGames.reduce(
    (acc, g) => { acc[g.type] = (acc[g.type] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  // Bucket by the CONFIGURED statuses (not the 4 hardcoded built-ins), so
  // GiocatoEsterno and any custom status are counted and the chart reconciles
  // with the total. Anything not in the config lands in "Altri".
  const statusCounts = new Map<string, number>();
  for (const g of allGames) statusCounts.set(g.status, (statusCounts.get(g.status) ?? 0) + 1);
  const byStatus: Record<string, number> = {};
  for (const s of statusConfig) {
    const n = statusCounts.get(s.key) ?? 0;
    if (n > 0) byStatus[labelFor(statusConfig, s.key)] = n;
    statusCounts.delete(s.key);
  }
  const altri = [...statusCounts.values()].reduce((a, b) => a + b, 0);
  if (altri > 0) byStatus["Altri"] = altri;

  const costByYear = buildCostByYear(allGames);

  const topExpensive = [...allGames]
    .filter((g) => g.cost)
    .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
    .slice(0, 10);

  // Risolvi i nomi delle bustine per il grafico
  const sleeveIds = sleeveUsageRaw.map((s) => s.sleeveId);
  const sleeves   = sleeveIds.length > 0
    ? await prisma.sleeve.findMany({ where: { id: { in: sleeveIds } } })
    : [];
  const sleeveMap = Object.fromEntries(sleeves.map((s) => [s.id, s.label || s.size]));
  const topSleeves = sleeveUsageRaw.map((s) => ({
    label: sleeveMap[s.sleeveId] ?? `#${s.sleeveId}`,
    qty:   s._sum.qty ?? 0,
    games: s._count.gameId,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
        Statistiche
      </h1>

      <StatCards
        totals={{
          all: allGames.length,
          inCollection: inCollection.length,
          forSale: forSale.length,
          preordered: preordered.length,
          sold: sold.length,
          wishlist: wishlistCount,
        }}
        finances={{
          totalInvested:    round2(totalInvested),
          collectionValue:  round2(collectionValue),
          totalSaleRevenue: round2(totalSaleRevenue),
          totalProfit:      round2(totalProfit),
          avgCost:          round2(avgCost),
          avgRating:        avgRating != null ? round2(avgRating) : null,
          dailySpend:       round2(dailySpend),
          daysOwned,
          startDate:        collectionStart.toLocaleDateString("it-IT"),
        }}
      />

      <Charts
        byStatus={byStatus}
        typeBreakdown={typeBreakdown}
        costByYear={costByYear}
        topExpensive={topExpensive.map((g) => ({
          name: g.name,
          cost: g.cost ?? 0,
          salePrice: g.salePrice,
          status: g.status,
        }))}
        topSleeves={topSleeves}
      />
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function buildCostByYear(games: { purchaseDate: Date | null; cost: number | null; saleDate: Date | null; salePrice: number | null }[]) {
  const byYear: Record<string, { purchased: number; sold: number; cost: number; revenue: number }> = {};
  for (const g of games) {
    if (g.purchaseDate) {
      const y = String(new Date(g.purchaseDate).getUTCFullYear());
      if (!byYear[y]) byYear[y] = { purchased: 0, sold: 0, cost: 0, revenue: 0 };
      byYear[y].purchased++;
      byYear[y].cost += g.cost ?? 0;
    }
    if (g.saleDate) {
      const y = String(new Date(g.saleDate).getUTCFullYear());
      if (!byYear[y]) byYear[y] = { purchased: 0, sold: 0, cost: 0, revenue: 0 };
      byYear[y].sold++;
      byYear[y].revenue += g.salePrice ?? 0;
    }
  }
  return Object.entries(byYear)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([year, data]) => ({ year, ...data }));
}
