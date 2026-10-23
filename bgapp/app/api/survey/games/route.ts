import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Ricerca giochi da proporre. Confine netto verso la collezione privata:
 * restituisce SOLO id/nome/copertina, e solo giochi "giocabili stasera" —
 * in collezione, espansioni escluse (si giocano dentro la scatola base). Mai
 * costi, stato, note o altro. È l'unico punto dell'area sondaggi che tocca la
 * tabella Game.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  const games = await prisma.game.findMany({
    where: {
      status: "InCollezione",
      type: { not: "Espansione" },
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    select: { id: true, name: true, thumbnail: true },
    orderBy: { name: "asc" },
    take: 25,
  });

  return NextResponse.json({ games });
}
