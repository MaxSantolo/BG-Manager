import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json(play, { status: 201 });
}
