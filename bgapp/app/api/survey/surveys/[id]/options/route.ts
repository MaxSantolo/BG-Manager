import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Proponi un gioco in un sondaggio aperto. Un gioco una volta sola per sondaggio. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const surveyId = parseInt(id);
  const body = await req.json();

  const proposedById = Number(body?.proposedById);
  const proposedByName = typeof body?.proposedByName === "string" ? body.proposedByName.trim() : "";
  const gameId = Number(body?.gameId);
  const gameName = typeof body?.gameName === "string" ? body.gameName.trim() : "";
  const gameThumbnail = typeof body?.gameThumbnail === "string" ? body.gameThumbnail : null;

  if (!proposedById || !proposedByName) return NextResponse.json({ error: "Dì prima chi sei" }, { status: 400 });
  if (!gameId || !gameName) return NextResponse.json({ error: "Gioco non valido" }, { status: 400 });

  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, select: { status: true } });
  if (!survey) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });
  if (survey.status !== "open") return NextResponse.json({ error: "Il sondaggio è chiuso." }, { status: 409 });

  // Pre-controllo del doppione: dà un 409 pulito senza dipendere dalla forma
  // dell'errore del DB (l'adapter Neon HTTP non espone il code P2002 come
  // quello WS). L'indice unique(surveyId, gameId) resta la garanzia d'integrità
  // per la rara corsa fra due proposte simultanee dello stesso gioco.
  const existing = await prisma.surveyOption.findFirst({
    where: { surveyId, gameId }, select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "Questo gioco è già tra le proposte." }, { status: 409 });

  const option = await prisma.surveyOption.create({
    data: { surveyId, gameId, gameName, gameThumbnail, proposedById, proposedByName },
    select: { id: true },
  });
  return NextResponse.json({ id: option.id });
}
