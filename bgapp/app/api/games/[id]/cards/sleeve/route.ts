import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaTx } from "@/lib/prismaTx";

/**
 * "Imbusta": assegna al gioco le bustine scelte dalla scheda (formato del
 * magazzino + quantità). Per ogni formato indicato la quantità SOSTITUISCE
 * quella che il gioco aveva; gli altri formati del gioco restano. La scorta
 * scala della differenza, con la stessa regola del modulo del gioco: se non
 * basta, 409 con il dettaglio e niente scritto.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = parseInt(id);
  const body = await req.json().catch(() => ({}));
  const wanted = new Map<number, number>();
  for (const r of Array.isArray(body?.rows) ? body.rows : []) {
    const sid = Number(r?.sleeveId), qty = Number(r?.qty);
    if (Number.isInteger(sid) && Number.isInteger(qty) && qty > 0) wanted.set(sid, qty);
  }
  if (wanted.size === 0) return NextResponse.json({ error: "Nessuna bustina da assegnare" }, { status: 400 });

  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true } });
  if (!game) return NextResponse.json({ error: "Gioco non trovato" }, { status: 404 });
  const [current, sleeves] = await Promise.all([
    prisma.gameSleeve.findMany({ where: { gameId, sleeveId: { in: [...wanted.keys()] } } }),
    prisma.sleeve.findMany({ where: { id: { in: [...wanted.keys()] } } }),
  ]);
  if (sleeves.length !== wanted.size) return NextResponse.json({ error: "Formato di bustina non trovato" }, { status: 404 });

  const oldBy = new Map<number, number>();
  for (const c of current) oldBy.set(c.sleeveId, (oldBy.get(c.sleeveId) ?? 0) + c.qty);
  const deltas = sleeves.map((s) => ({ s, delta: wanted.get(s.id)! - (oldBy.get(s.id) ?? 0) }));
  const insufficient = deltas.filter(({ s, delta }) => delta > s.quantity)
    .map(({ s, delta }) => ({ sleeveId: s.id, size: s.size, label: s.label, requested: delta, available: s.quantity }));
  if (insufficient.length > 0)
    return NextResponse.json({ error: "Magazzino bustine insufficiente", insufficient }, { status: 409 });

  await prismaTx.$transaction(async (tx) => {
    for (const { s, delta } of deltas) {
      if (delta !== 0) await tx.sleeve.update({ where: { id: s.id }, data: { quantity: { decrement: delta } } });
      await tx.gameSleeve.deleteMany({ where: { gameId, sleeveId: s.id } });
      await tx.gameSleeve.create({ data: { gameId, sleeveId: s.id, qty: wanted.get(s.id)! } });
    }
  });

  const gameSleeves = await prisma.gameSleeve.findMany({ where: { gameId }, include: { sleeve: true } });
  return NextResponse.json({ ok: true, gameSleeves });
}
