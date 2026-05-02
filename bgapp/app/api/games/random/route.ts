import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const players = searchParams.get("players");
  const maxTime = searchParams.get("maxTime");
  const exclude = searchParams.get("exclude")?.split(",").map(Number).filter(Boolean) ?? [];

  const games = await prisma.game.findMany({
    where: {
      status: "InCollezione",
      ...(players ? {
        minPlayers: { lte: parseInt(players) },
        maxPlayers: { gte: parseInt(players) },
      } : {}),
      ...(maxTime ? { playTime: { lte: parseInt(maxTime) } } : {}),
      ...(exclude.length ? { id: { notIn: exclude } } : {}),
    },
    select: {
      id: true, name: true, thumbnail: true, image: true,
      bggRating: true, bggWeight: true, minPlayers: true,
      maxPlayers: true, playTime: true, yearPublished: true,
      bggId: true,
    },
  });

  if (games.length === 0) return NextResponse.json(null);
  const pick = games[Math.floor(Math.random() * games.length)];
  return NextResponse.json({ ...pick, total: games.length });
}
