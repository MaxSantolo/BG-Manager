import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/dupCheck";

// Finds or creates a game by bggId with status "GiocatoEsterno".
// If the game already exists in any status, returns it as-is.
export async function POST(req: NextRequest) {
  const { bggId, name, thumbnail, image, bggRating, bggWeight,
          minPlayers, maxPlayers, playTime, yearPublished } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });

  // If bggId provided, reuse an existing collection row; otherwise honour the
  // one-row-per-bggId invariant by clearing any wishlist entry first (logging an
  // external play of a wishlisted game promotes it out of the wishlist — leaving
  // both would be the cross-table duplicate dupCheck forbids).
  if (bggId) {
    const existing = await prisma.game.findFirst({ where: { bggId } });
    if (existing) return NextResponse.json({ id: existing.id, status: existing.status });
    await prisma.wishlistGame.deleteMany({ where: { bggId } });
  }

  let game;
  try {
    game = await prisma.game.create({
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
  } catch (err) {
    // Raced against a concurrent create of the same bggId — reuse the winner.
    if (isUniqueViolation(err) && bggId) {
      const existing = await prisma.game.findFirst({ where: { bggId } });
      if (existing) return NextResponse.json({ id: existing.id, status: existing.status });
    }
    throw err;
  }

  return NextResponse.json({ id: game.id, status: game.status }, { status: 201 });
}
