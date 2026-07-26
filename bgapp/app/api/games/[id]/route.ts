import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ensureCollectionItemOnBgg,
  updateCollectionStatusOnBgg,
  clearCollectionStatusOnBgg,
  bggFlagsForStatus,
  withBggTimeout,
  BggWriteError,
  BggTimeoutError,
} from "@/lib/bggWrite";

export const maxDuration = 60;

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

  const before = await prisma.game.findUnique({
    where: { id: parseInt(id) },
    select: { status: true, bggCollId: true, bggId: true },
  });

  // Relinking to a different BGG game invalidates the stored collection id —
  // keeping it would push this game's edits onto the previous game's entry.
  const newBggId = body.bggId != null ? parseInt(body.bggId) : null;
  const relinked = before != null && newBggId !== before.bggId;

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
      ...(relinked ? { bggCollId: null } : {}),
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
    const sleevesToCreate = (body.sleeves as { sleeveId: number; qty?: number }[]).map(s => ({
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

  // BGG is authoritative for status, so a local change has to reach it —
  // otherwise the next sync would simply undo what was just saved here.
  let bgg: { pushed: boolean; pending?: boolean; error?: string } = { pushed: false };
  const statusChanged = before && before.status !== game.status;
  if (game.bggId && bggFlagsForStatus(game.status)) {
    try {
      if (!game.bggCollId) {
        // Never made it to BGG (added before this existed, or the push failed).
        const collId = await withBggTimeout(ensureCollectionItemOnBgg(game.bggId, game.status));
        if (collId) {
          await prisma.game.update({ where: { id: game.id }, data: { bggCollId: collId } });
          bgg = { pushed: true };
        }
      } else if (statusChanged) {
        await withBggTimeout(updateCollectionStatusOnBgg(game.bggCollId, game.status));
        bgg = { pushed: true };
      }
    } catch (err) {
      // Local update already committed; a slow BGG push is reconciled by sync.
      const pending = err instanceof BggTimeoutError;
      bgg = { pushed: false, pending, error: pending ? undefined : (err instanceof BggWriteError ? err.message : "Errore BGG") };
    }
  }

  return NextResponse.json({ ...gameWithSleeves, bgg });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameId = parseInt(id);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { bggCollId: true },
  });
  if (!game) return NextResponse.json({ error: "Gioco non trovato" }, { status: 404 });

  // Clear it on BGG first. Deleting only here would let the next sync import
  // it straight back, which reads as the delete silently failing.
  if (game.bggCollId) {
    try {
      await clearCollectionStatusOnBgg(game.bggCollId);
    } catch (err) {
      return NextResponse.json(
        {
          error: err instanceof BggWriteError ? err.message : "Errore BGG",
          hint:  "Il gioco è ancora nella collezione BGG: eliminandolo solo qui verrebbe re-importato alla prossima sincronizzazione.",
        },
        { status: 409 }
      );
    }
  }

  await prisma.gameSleeve.deleteMany({ where: { gameId } });
  await prisma.game.delete({ where: { id: gameId } });
  return NextResponse.json({ ok: true, bgg: { cleared: !!game.bggCollId } });
}
