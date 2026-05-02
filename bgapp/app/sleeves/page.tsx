import { prisma } from "@/lib/prisma";
import SleevesList from "./SleevesList";

export const metadata = { title: "Registro bustine" };
export const dynamic = "force-dynamic";

export default async function SleevesPage() {
  const [sleeves, usageRaw] = await Promise.all([
    prisma.sleeve.findMany({ orderBy: { size: "asc" } }),
    prisma.gameSleeve.groupBy({
      by: ["sleeveId"],
      _sum: { qty: true },
      _count: { gameId: true },
    }),
  ]);

  const usageMap = Object.fromEntries(
    usageRaw.map((u) => [u.sleeveId, { qty: u._sum.qty ?? 0, games: u._count.gameId }])
  );

  return <SleevesList sleeves={sleeves} usageMap={usageMap} />;
}
