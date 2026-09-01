import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findBggConflict, isUniqueViolation } from "@/lib/dupCheck";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const bggId = searchParams.get("bggId");

  const where: Record<string, unknown> = {};
  if (search) where.name = { contains: search };
  if (type) where.type = type;
  if (bggId) where.bggId = parseInt(bggId);

  const games = await prisma.wishlistGame.findMany({
    where,
    orderBy: [{ desirability: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(games);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // One row per BGG id: reject if already on the wishlist or in the collection.
  if (body.bggId) {
    const conflict = await findBggConflict(parseInt(body.bggId));
    if (conflict) return NextResponse.json({ error: "duplicate", existing: conflict }, { status: 409 });
  }

  let game;
  try {
    game = await prisma.wishlistGame.create({
    data: {
      bggId: body.bggId || null,
      name: body.name,
      type: body.type || "Base",
      valueRange: body.valueRange || null,
      desirability: body.desirability ? parseInt(body.desirability) : 3,
      status: body.status || null,
      insert: body.insert || "No",
      sleeves: body.sleeves || "No",
      sleeveData: body.sleeveData || "[]",
      thumbnail: body.thumbnail || null,
      image: body.image || null,
      description: body.description || null,
      designers: body.designers ?? "[]",
      mechanics: body.mechanics ?? "[]",
      bggRating: body.bggRating ? parseFloat(body.bggRating) : null,
      bggWeight: body.bggWeight ? parseFloat(body.bggWeight) : null,
      minPlayers: body.minPlayers ? parseInt(body.minPlayers) : null,
      maxPlayers: body.maxPlayers ? parseInt(body.maxPlayers) : null,
      playTime: body.playTime ? parseInt(body.playTime) : null,
      yearPublished: body.yearPublished ? parseInt(body.yearPublished) : null,
      notes: body.notes || null,
    },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ error: "duplicate" }, { status: 409 });
    throw err;
  }
  return NextResponse.json(game, { status: 201 });
}
