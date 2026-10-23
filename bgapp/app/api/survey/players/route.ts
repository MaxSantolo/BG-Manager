import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Elenco giocatori per il selettore "chi sei". Proiezione ridotta: l'area
 * sondaggi è dietro una password diversa da quella dell'app, quindi non espone
 * i campi interni del Player (BGG username, playCount…), solo quanto serve a
 * scegliere o creare un nome.
 */
export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: [{ playCount: "desc" }, { name: "asc" }],
    select: { id: true, name: true, avatarUrl: true },
  });
  return NextResponse.json({ players });
}

/** Crea un giocatore (solo nome, come in app). Nome già esistente → lo riusa. */
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });

  const existing = await prisma.player.findUnique({
    where: { name: cleanName },
    select: { id: true, name: true, avatarUrl: true },
  });
  if (existing) return NextResponse.json(existing);

  const player = await prisma.player.create({
    data: { name: cleanName },
    select: { id: true, name: true, avatarUrl: true },
  });
  return NextResponse.json(player);
}
