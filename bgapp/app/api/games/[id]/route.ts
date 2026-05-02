import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const body = await request.json();

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

  return NextResponse.json(gameWithSleeves);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.game.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
