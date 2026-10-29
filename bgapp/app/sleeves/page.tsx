import { prisma } from "@/lib/prisma";
import { OUT_OF_COLLECTION } from "@/lib/status";
import { parseCardSets, shoppingList } from "@/lib/cardSizes";
import SleevesList from "./SleevesList";
import SleeveNeeds from "./SleeveNeeds";

export const metadata = { title: "Magazzino bustine" };
export const dynamic = "force-dynamic";

export default async function SleevesPage() {
  const [sleeves, games] = await Promise.all([
    prisma.sleeve.findMany({ orderBy: { size: "asc" } }),
    prisma.game.findMany({
      where: { status: { notIn: OUT_OF_COLLECTION }, bggId: { not: null } },
      select: { name: true, cardTypes: true, cardSetId: true, gameSleeves: { select: { sleeveId: true, qty: true } } },
    }),
  ]);
  const needs = shoppingList(
    games.map((g) => ({ name: g.name, sets: parseCardSets(g.cardTypes), setId: g.cardSetId, assigned: g.gameSleeves })),
    sleeves,
  );
  return (
    <div className="space-y-6">
      <SleevesList sleeves={sleeves} />
      <SleeveNeeds {...needs} total={games.length} />
    </div>
  );
}
