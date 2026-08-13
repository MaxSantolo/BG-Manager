import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [allGames, wishlistCount] = await Promise.all([
    prisma.game.findMany(),
    prisma.wishlistGame.count(),
  ]);

  const inCollection = allGames.filter((g) => g.status === "InCollezione");
  const forSale = allGames.filter((g) => g.status === "InVendita");
  const preordered = allGames.filter((g) => g.status === "Preordinato");
  const sold = allGames.filter((g) => g.status === "Venduto");

  const totalInvested = allGames.reduce((sum, g) => sum + (g.cost ?? 0), 0);
  const totalSaleRevenue = sold.reduce((sum, g) => sum + (g.salePrice ?? 0), 0);
  const totalSoldCost = sold.reduce((sum, g) => sum + (g.cost ?? 0), 0);
  const totalProfit = totalSaleRevenue - totalSoldCost;

  const avgCost =
    allGames.filter((g) => g.cost).length > 0
      ? totalInvested / allGames.filter((g) => g.cost).length
      : 0;

  const typeBreakdown = allGames.reduce(
    (acc, g) => {
      acc[g.type] = (acc[g.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byStatus = {
    InCollezione: inCollection.length,
    InVendita: forSale.length,
    Preordinato: preordered.length,
    Venduto: sold.length,
  };

  const costByYear = buildCostByYear(allGames);
  const topExpensive = [...allGames]
    .filter((g) => g.cost)
    .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
    .slice(0, 10)
    .map((g) => ({ name: g.name, cost: g.cost, salePrice: g.salePrice, status: g.status }));

  const insertStats = countField(allGames, "insert");
  const sleevesStats = countField(allGames, "sleeves");

  return NextResponse.json({
    totals: {
      all: allGames.length,
      inCollection: inCollection.length,
      forSale: forSale.length,
      preordered: preordered.length,
      sold: sold.length,
      wishlist: wishlistCount,
    },
    finances: {
      totalInvested: round2(totalInvested),
      totalSaleRevenue: round2(totalSaleRevenue),
      totalProfit: round2(totalProfit),
      avgCost: round2(avgCost),
    },
    byStatus,
    typeBreakdown,
    costByYear,
    topExpensive,
    insertStats,
    sleevesStats,
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function countField(games: { [key: string]: unknown }[], field: string) {
  const result: Record<string, number> = {};
  for (const g of games) {
    const val = String(g[field] ?? "Unknown");
    result[val] = (result[val] ?? 0) + 1;
  }
  return result;
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
