import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const game = await prisma.game.findUnique({
    where: { id: parseInt(id) },
    include: { gameSleeves: { include: { sleeve: true } } },
  });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(game);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameIdNum = parseInt(id);
  const body = await request.json();

  // Sleeve magazine validation: compute deltas vs current GameSleeve and validate
  if (Array.isArray(body.sleeves)) {
    const current = await prisma.gameSleeve.findMany({ where: { gameId: gameIdNum } });
    const oldBy: Record<number, number> = {};
    for (const c of current) oldBy[c.sleeveId] = (oldBy[c.sleeveId] ?? 0) + c.qty;

    const newBy: Record<number, number> = {};
    for (const s of body.sleeves) {
      const sid = Number(s.sleeveId);
      const q   = Number(s.qty ?? 0);
      if (!sid || q <= 0) continue;
      newBy[sid] = (newBy[sid] ?? 0) + q;
    }

    const allIds = Array.from(new Set([...Object.keys(oldBy), ...Object.keys(newBy)].map(Number)));
    const needsCheck = allIds.filter(sid => (newBy[sid] ?? 0) > (oldBy[sid] ?? 0));
    if (needsCheck.length > 0) {
      const stocks = await prisma.sleeve.findMany({ where: { id: { in: needsCheck } } });
      const insufficient = stocks
        .map(s => ({ s, delta: (newBy[s.id] ?? 0) - (oldBy[s.id] ?? 0) }))
        .filter(({ s, delta }) => delta > s.quantity)
        .map(({ s, delta }) => ({ sleeveId: s.id, size: s.size, label: s.label, requested: delta, available: s.quantity }));
      if (insufficient.length > 0) {
        return NextResponse.json({ error: "Magazzino bustine insufficiente", insufficient }, { status: 409 });
      }
    }

    // Apply magazine deltas (negative delta = restitution to warehouse)
    for (const sid of allIds) {
      const delta = (newBy[sid] ?? 0) - (oldBy[sid] ?? 0);
      if (delta === 0) continue;
      await prisma.sleeve.update({
        where: { id: sid },
        data: { quantity: { decrement: delta } },
      });
    }
  }

  // Aggiorna il gioco senza sleeveData
  const game = await prisma.game.update({
    where: { id: parseInt(id) },
    data: {
      bggId:        body.bggId          ?? undefined,
      name:         body.name,
      type:         body.type,
      cost:         body.cost != null    ? parseFloat(body.cost) : null,
      salePrice:    body.salePrice != null ? parseFloat(body.salePrice) : null,
      status:       body.status,
      insert:       body.insert,
      sleeves:      undefined, // legacy
      sleeveData:   undefined, // legacy
      purchaseDate: body.purchaseDate   ? new Date(body.purchaseDate) : null,
      saleDate:     body.saleDate       ? new Date(body.saleDate) : null,
      thumbnail:    body.thumbnail      ?? null,
      image:        body.image          ?? null,
      description:  body.description    ?? null,
      designers:    body.designers      ?? "[]",
      mechanics:    body.mechanics      ?? "[]",
      bggRating:    body.bggRating != null ? parseFloat(body.bggRating) : null,
      bggWeight:    body.bggWeight != null ? parseFloat(body.bggWeight) : null,
      minPlayers:   body.minPlayers != null ? parseInt(body.minPlayers) : null,
      maxPlayers:   body.maxPlayers != null ? parseInt(body.maxPlayers) : null,
      playTime:     body.playTime != null ? parseInt(body.playTime) : null,
      yearPublished: body.yearPublished != null ? parseInt(body.yearPublished) : null,
      notes:        body.notes          ?? null,
    },
  });

  // Aggiorna le associazioni bustine (GameSleeve)
  if (Array.isArray(body.sleeves)) {
    // Cancella tutte le associazioni precedenti
    await prisma.gameSleeve.deleteMany({ where: { gameId: game.id } });
    // Inserisci le nuove
    const sleevesToCreate = body.sleeves.map((s: any) => ({
      gameId: game.id,
      sleeveId: s.sleeveId,
      qty: s.qty ?? 1,
    }));
    for (const s of sleevesToCreate) {
      await prisma.gameSleeve.create({ data: s });
    }
  }

  // Restituisci anche le bustine associate
  const gameWithSleeves = await prisma.game.findUnique({
    where: { id: game.id },
    include: { gameSleeves: { include: { sleeve: true } } },
  });

  return NextResponse.json(gameWithSleeves);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameId = parseInt(id);
  await prisma.gameSleeve.deleteMany({ where: { gameId } });
  await prisma.game.delete({ where: { id: gameId } });
  return NextResponse.json({ ok: true });
}
