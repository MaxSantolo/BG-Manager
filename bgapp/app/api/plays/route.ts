import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { savePlayToBgg, withBggTimeout, bggPushResult } from "@/lib/bggWrite";
import { toBggDate, toBggPlayers } from "@/lib/playPayload";
import { registerPlace } from "@/lib/registry";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const gameId = searchParams.get("gameId");

  const where = gameId ? { gameId: parseInt(gameId) } : undefined;

  const [plays, total] = await Promise.all([
    prisma.play.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.play.count({ where }),
  ]);

  return NextResponse.json({ plays, total, page, limit });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bggPlayId, date, quantity, duration, location, notes, incomplete, gameName, bggGameId, gameId, players } = body;

  // Local write first: a BGG outage must never lose what was just typed.
  const play = await prisma.play.create({
    data: {
      bggPlayId:  bggPlayId ?? null,
      date:       new Date(date),
      quantity:   quantity ?? 1,
      duration:   duration ?? null,
      location:   location ?? null,
      notes:      notes ?? null,
      incomplete: incomplete ?? false,
      gameName,
      bggGameId:  bggGameId ?? null,
      gameId:     gameId ?? null,
      players:    players?.length ? JSON.stringify(players) : null,
    },
  });

  // A location typed here becomes a reusable place next time.
  await registerPlace(location);

  // Push to BGG and adopt the id it assigns, so the next sync recognises this
  // play as already-known instead of importing a duplicate.
  if (!bggGameId || bggPlayId) return NextResponse.json({ ...play, bgg: { pushed: false } }, { status: 201 });

  try {
    const newBggPlayId = await withBggTimeout(savePlayToBgg({
      bggGameId,
      date: toBggDate(date),
      quantity, duration, location, notes, incomplete,
      players: toBggPlayers(players),
    }));
    const updated = await prisma.play.update({
      where: { id: play.id },
      data:  { bggPlayId: newBggPlayId },
    });
    return NextResponse.json({ ...updated, bgg: { pushed: true } }, { status: 201 });
  } catch (err) {
    // The play is already saved locally; a slow/failed BGG push is reconciled
    // by the next sync, so this never blocks the user.
    return NextResponse.json({ ...play, bgg: bggPushResult(err) }, { status: 201 });
  }
}
