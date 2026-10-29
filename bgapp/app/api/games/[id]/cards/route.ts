import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCardSets } from "@/lib/bggCards";
import { parseCardSets, chosenSet, type CardSet } from "@/lib/cardSizes";

export const maxDuration = 60;

/**
 * Carica da BGG le carte del gioco e le salva. Solo a richiesta (tasto nella
 * scheda). Con più card set si usa il primo; ricaricando, una scelta diversa
 * fatta a mano resta (se quel set c'è ancora).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { id: parseInt(id) }, select: { id: true, bggId: true, cardSetId: true } });
  if (!game) return NextResponse.json({ error: "Gioco non trovato" }, { status: 404 });
  if (!game.bggId) return NextResponse.json({ error: "Il gioco non è collegato a BGG" }, { status: 400 });

  let sets: CardSet[];
  try {
    sets = await fetchCardSets(game.bggId);
  } catch (err) {
    return NextResponse.json({ error: `Lettura da BGG non riuscita: ${err instanceof Error ? err.message : "errore"}` }, { status: 502 });
  }
  const chosen = chosenSet(sets, game.cardSetId);

  const saved = await prisma.game.update({
    where: { id: game.id },
    data: { cardTypes: JSON.stringify({ sets }), cardSetId: chosen?.id ?? null, cardsCheckedAt: new Date() },
    select: { cardsCheckedAt: true, cardSetId: true },
  });
  return NextResponse.json({ sets, cardSetId: saved.cardSetId, checkedAt: saved.cardsCheckedAt });
}

/** Usa un altro dei card set già caricati (se il primo non è quello giusto). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const setId = Number(body?.setId);
  if (!Number.isInteger(setId)) return NextResponse.json({ error: "Serve setId" }, { status: 400 });
  const game = await prisma.game.findUnique({ where: { id: parseInt(id) }, select: { id: true, cardTypes: true } });
  if (!game) return NextResponse.json({ error: "Gioco non trovato" }, { status: 404 });
  const sets = parseCardSets(game.cardTypes);
  if (!sets?.some((s) => s.id === setId)) return NextResponse.json({ error: "Card set non trovato" }, { status: 404 });
  await prisma.game.update({ where: { id: game.id }, data: { cardSetId: setId } });
  return NextResponse.json({ sets, cardSetId: setId });
}
