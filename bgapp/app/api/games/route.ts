import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBggGame } from "@/lib/bgg";

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

  // If bggId provided and no thumbnail yet, auto-fetch from BGG
  let bggData = null;
  if (body.bggId && !body.thumbnail) {
    bggData = await getBggGame(parseInt(body.bggId));
  }

  // Crea il gioco senza sleeveData
  const game = await prisma.game.create({
    data: {
      bggId:        body.bggId           ? parseInt(body.bggId) : null,
      name:         body.name,
      type:         body.type            || "Base",
      cost:         body.cost != null    ? parseFloat(body.cost) : null,
      salePrice:    body.salePrice != null ? parseFloat(body.salePrice) : null,
      status:       body.status          || "InCollezione",
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

  // Gestione associazione bustine (GameSleeve)
  if (Array.isArray(body.sleeves)) {
    const sleevesToCreate = body.sleeves.map((s: any) => ({
      gameId: game.id,
      sleeveId: s.sleeveId,
      qty: s.qty ?? 1,
    }));
    if (sleevesToCreate.length > 0) {
      await prisma.gameSleeve.createMany({ data: sleevesToCreate });
    }
  }

  // Restituisci anche le bustine associate
  const gameWithSleeves = await prisma.game.findUnique({
    where: { id: game.id },
    include: { gameSleeves: { include: { sleeve: true } } },
  });

  return NextResponse.json(gameWithSleeves, { status: 201 });
}
