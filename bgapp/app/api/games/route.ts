import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaTx } from "@/lib/prismaTx";
import { getBggGame } from "@/lib/bgg";
import { findBggConflict, isUniqueViolation } from "@/lib/dupCheck";
import { ensureCollectionItemOnBgg, withBggTimeout, BggWriteError, BggTimeoutError } from "@/lib/bggWrite";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search  = searchParams.get("search") || "";
  const status  = searchParams.get("status") || "";
  const type    = searchParams.get("type") || "";
  const bggId   = searchParams.get("bggId");
  const page    = parseInt(searchParams.get("page") || "1");
  const limit   = parseInt(searchParams.get("limit") || "50");
  const skip    = (page - 1) * limit;

  const where = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(status ? { status } : {}),
    ...(type   ? { type }   : {}),
    ...(bggId  ? { bggId: parseInt(bggId) } : {}),
  };

  const [games, total] = await Promise.all([
    prisma.game.findMany({ where, orderBy: { name: "asc" }, skip, take: limit }),
    prisma.game.count({ where }),
  ]);
  return NextResponse.json({ games, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // One row per BGG id: reject a game already in the collection or on the
  // wishlist. Manual games (no bggId) are exempt and may repeat.
  if (body.bggId) {
    const conflict = await findBggConflict(parseInt(body.bggId));
    if (conflict) return NextResponse.json({ error: "duplicate", existing: conflict }, { status: 409 });
  }

  // Pre-validate sleeve magazine before creating anything
  if (Array.isArray(body.sleeves) && body.sleeves.length > 0) {
    const requested: Record<number, number> = {};
    for (const s of body.sleeves) {
      const id = Number(s.sleeveId);
      const q  = Number(s.qty ?? 0);
      if (!id || q <= 0) continue;
      requested[id] = (requested[id] ?? 0) + q;
    }
    const ids = Object.keys(requested).map(Number);
    if (ids.length > 0) {
      const stocks = await prisma.sleeve.findMany({ where: { id: { in: ids } } });
      const insufficient = stocks
        .filter(s => requested[s.id] > s.quantity)
        .map(s => ({ sleeveId: s.id, size: s.size, label: s.label, requested: requested[s.id], available: s.quantity }));
      if (insufficient.length > 0) {
        return NextResponse.json({ error: "Magazzino bustine insufficiente", insufficient }, { status: 409 });
      }
    }
  }

  // If bggId provided and no thumbnail yet, auto-fetch from BGG
  let bggData = null;
  if (body.bggId && !body.thumbnail) {
    bggData = await getBggGame(parseInt(body.bggId));
  }

  // Game row + its sleeve associations + the warehouse decrements are one
  // atomic unit: a mid-sequence failure must not leave a game with mismatched
  // stock. Runs on the WS-backed client because the HTTP one can't transact.
  const sleeveRows = Array.isArray(body.sleeves)
    ? (body.sleeves as { sleeveId: number; qty?: number }[])
    : [];

  let game;
  try {
    game = await prismaTx.$transaction(async (tx) => {
    const created = await tx.game.create({
      data: {
        bggId:        body.bggId           ? parseInt(body.bggId) : null,
        name:         body.name,
        type:         body.type            || "Base",
        cost:         body.cost != null    ? parseFloat(body.cost) : null,
        salePrice:    body.salePrice != null ? parseFloat(body.salePrice) : null,
        status:       body.status          || "InCollezione",
        winMode:      body.winMode          || "high",
        insert:       body.insert          || "No",
        sleeves:      undefined, // campo legacy, non più usato
        sleeveData:   undefined, // campo legacy, non più usato
        purchaseDate: body.purchaseDate    ? new Date(body.purchaseDate) : null,
        saleDate:     body.saleDate        ? new Date(body.saleDate) : null,
        thumbnail:    bggData?.thumbnail   || body.thumbnail   || null,
        image:        bggData?.image       || body.image       || null,
        description:  bggData?.description || body.description || null,
        designers:    JSON.stringify(bggData?.designers ?? (body.designers ? JSON.parse(body.designers) : [])),
        mechanics:    JSON.stringify(bggData?.mechanics ?? (body.mechanics ? JSON.parse(body.mechanics) : [])),
        bggRating:    bggData?.bggRating   ?? (body.bggRating != null ? parseFloat(body.bggRating) : null),
        bggWeight:    bggData?.bggWeight   ?? (body.bggWeight != null ? parseFloat(body.bggWeight) : null),
        minPlayers:   bggData?.minPlayers  ?? (body.minPlayers != null ? parseInt(body.minPlayers) : null),
        maxPlayers:   bggData?.maxPlayers  ?? (body.maxPlayers != null ? parseInt(body.maxPlayers) : null),
        playTime:     bggData?.playTime    ?? (body.playTime != null ? parseInt(body.playTime) : null),
        yearPublished: bggData?.yearPublished ?? (body.yearPublished != null ? parseInt(body.yearPublished) : null),
        notes:        body.notes           || null,
        bggEnrichedAt: bggData ? new Date() : null,
      },
    });

    for (const s of sleeveRows) {
      const qty = s.qty ?? 1;
      await tx.gameSleeve.create({ data: { gameId: created.id, sleeveId: s.sleeveId, qty } });
      await tx.sleeve.update({ where: { id: s.sleeveId }, data: { quantity: { decrement: qty } } });
    }
    return created;
    });
  } catch (err) {
    // Lost a race against a concurrent insert of the same bggId (the partial
    // unique index is the hard guarantee behind the pre-check above).
    if (isUniqueViolation(err)) return NextResponse.json({ error: "duplicate" }, { status: 409 });
    throw err;
  }

  // Restituisci anche le bustine associate
  const gameWithSleeves = await prisma.game.findUnique({
    where: { id: game.id },
    include: { gameSleeves: { include: { sleeve: true } } },
  });

  // Put it in the BGG collection too, and keep the id we get back so later
  // status changes can be pushed without another lookup.
  let bgg: { pushed: boolean; pending?: boolean; error?: string } = { pushed: false };
  if (game.bggId) {
    try {
      const collId = await withBggTimeout(ensureCollectionItemOnBgg(game.bggId, game.status));
      if (collId) {
        await prisma.game.update({ where: { id: game.id }, data: { bggCollId: collId } });
        if (gameWithSleeves) gameWithSleeves.bggCollId = collId;   // keep the reply current
        bgg = { pushed: true };
      }
    } catch (err) {
      // Game is already saved locally; a slow BGG push is reconciled by sync.
      const pending = err instanceof BggTimeoutError;
      bgg = { pushed: false, pending, error: pending ? undefined : (err instanceof BggWriteError ? err.message : "Errore BGG") };
    }
  }

  return NextResponse.json({ ...gameWithSleeves, bgg }, { status: 201 });
}
