import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Finds or creates a game by bggId with status "GiocatoEsterno".
// If the game already exists in any status, returns it as-is.
export async function POST(req: NextRequest) {
  const { bggId, name, thumbnail, image, bggRating, bggWeight,
          minPlayers, maxPlayers, playTime, yearPublished } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });

  // If bggId provided, check for existing game first
  if (bggId) {
    const existing = await prisma.game.findFirst({ where: { bggId } });
    if (existing) return NextResponse.json({ id: existing.id, status: existing.status });
  }

  const game = await prisma.game.create({
    data: {
      bggId:        bggId ?? null,
      name:         name.trim(),
      type:         "Base",
      status:       "GiocatoEsterno",
      thumbnail:    thumbnail ?? null,
      image:        image ?? null,
      bggRating:    bggRating ?? null,
      bggWeight:    bggWeight ?? null,
      minPlayers:   minPlayers ?? null,
      maxPlayers:   maxPlayers ?? null,
      playTime:     playTime ?? null,
      yearPublished: yearPublished ?? null,
      designers:    "[]",
      mechanics:    "[]",
    },
  });

  return NextResponse.json({ id: game.id, status: game.status }, { status: 201 });
}
