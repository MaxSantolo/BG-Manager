import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findBggConflict, isUniqueViolation } from "@/lib/dupCheck";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const game = await prisma.wishlistGame.findUnique({ where: { id: parseInt(id) } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(game);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Re-linking to a bggId owned elsewhere would break one-row-per-BGG-id.
  if (body.bggId != null) {
    const conflict = await findBggConflict(parseInt(body.bggId), { wishlistId: parseInt(id) });
    if (conflict) return NextResponse.json({ error: "duplicate", existing: conflict }, { status: 409 });
  }

  let game;
  try {
    game = await prisma.wishlistGame.update({
    where: { id: parseInt(id) },
    data: {
      bggId: body.bggId ?? undefined,
      name: body.name,
      type: body.type,
      valueRange: body.valueRange ?? null,
      desirability: body.desirability ? parseInt(body.desirability) : 3,
      status: body.status ?? null,
      insert: body.insert,
      sleeves: body.sleeves,
      sleeveData: body.sleeveData ?? "[]",
      thumbnail: body.thumbnail ?? null,
      image: body.image ?? null,
      description: body.description ?? null,
      designers: body.designers ?? "[]",
      mechanics: body.mechanics ?? "[]",
      bggRating: body.bggRating != null ? parseFloat(body.bggRating) : null,
      bggWeight: body.bggWeight != null ? parseFloat(body.bggWeight) : null,
      minPlayers: body.minPlayers != null ? parseInt(body.minPlayers) : null,
      maxPlayers: body.maxPlayers != null ? parseInt(body.maxPlayers) : null,
      playTime: body.playTime != null ? parseInt(body.playTime) : null,
      yearPublished: body.yearPublished != null ? parseInt(body.yearPublished) : null,
      notes: body.notes ?? null,
    },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ error: "duplicate" }, { status: 409 });
    throw err;
  }
  return NextResponse.json(game);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.wishlistGame.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
