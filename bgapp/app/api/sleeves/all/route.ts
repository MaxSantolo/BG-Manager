import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET tutte le bustine con il loro disponibile (quantity - assegnate ai giochi)
export async function GET() {
  const [sleeves, assigned] = await Promise.all([
    prisma.sleeve.findMany({ orderBy: { size: "asc" } }),
    prisma.gameSleeve.groupBy({ by: ["sleeveId"], _sum: { qty: true } }),
  ]);
  const usedById = new Map(assigned.map(a => [a.sleeveId, a._sum.qty ?? 0]));
  const enriched = sleeves.map(s => ({
    ...s,
    available: s.quantity - (usedById.get(s.id) ?? 0),
  }));
  return NextResponse.json(enriched);
}
