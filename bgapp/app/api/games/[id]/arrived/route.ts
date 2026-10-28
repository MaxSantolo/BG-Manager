import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_TZ, todayInput } from "@/lib/dates";
import { syncGameStatusToBgg } from "@/lib/bggWrite";

export const maxDuration = 60;

/**
 * "Arrivato": un preordine diventa un gioco in collezione.
 * - stato Preordinato → InCollezione (e lo si porta su BGG, che è autorevole
 *   sullo stato: senza la spinta la sync lo riporterebbe a preordinato);
 * - data d'acquisto = oggi SOLO se vuota: per un pledge la data vera è quella
 *   del pagamento, non dell'arrivo, e non va sovrascritta.
 * Provenienza, pagato e consegna prevista restano come storico.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gameId = parseInt(id);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, status: true, purchaseDate: true },
  });
  if (!game) return NextResponse.json({ error: "Gioco non trovato" }, { status: 404 });
  if (game.status !== "Preordinato") {
    return NextResponse.json({ error: "Questo gioco non è un preordine." }, { status: 409 });
  }

  const setPurchaseDate = game.purchaseDate == null;
  const updated = await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "InCollezione",
      ...(setPurchaseDate ? { purchaseDate: new Date(`${todayInput(APP_TZ)}T00:00:00.000Z`) } : {}),
    },
    select: { id: true, bggId: true, bggCollId: true, status: true, name: true },
  });

  const bgg = await syncGameStatusToBgg(updated, "Preordinato");
  return NextResponse.json({ ok: true, name: updated.name, purchaseDateSet: setPurchaseDate, bgg });
}
