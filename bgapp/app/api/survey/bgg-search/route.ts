import { NextRequest, NextResponse } from "next/server";
import { searchBgg } from "@/lib/bgg";

export const dynamic = "force-dynamic";

/**
 * Ricerca giochi su BoardGameGeek per proporli. Le proposte NON vengono dalla
 * collezione: l'area sondaggi non tocca la tabella Game. Restituisce
 * id (bgg) / nome / anno; la copertina e il numero giocatori si prendono alla
 * proposta (un solo /thing invece di uno per ogni risultato).
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ games: [] });

  const results = await searchBgg(q);
  return NextResponse.json({
    games: results.slice(0, 25).map((r) => ({ bggId: r.id, name: r.name, year: r.yearPublished ?? null })),
  });
}
