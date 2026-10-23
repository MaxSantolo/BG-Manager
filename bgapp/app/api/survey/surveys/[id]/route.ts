import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildResults } from "@/lib/survey";

export const dynamic = "force-dynamic";

/** Dettaglio: sondaggio + regole + opzioni con conteggio voti + chi ha votato cosa. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const surveyId = parseInt(id);

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: {
      id: true, title: true, status: true, createdById: true, createdByName: true, createdAt: true,
      multiVote: true, maxPicks: true, proposersCanVoteOwn: true,
    },
  });
  if (!survey) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });

  const [options, votes] = await Promise.all([
    prisma.surveyOption.findMany({
      where: { surveyId },
      select: {
        id: true, bggId: true, gameName: true, gameThumbnail: true,
        minPlayers: true, maxPlayers: true,
        proposedById: true, proposedByName: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.vote.findMany({
      where: { surveyId },
      select: { optionId: true, voterId: true, voterName: true },
    }),
  ]);

  return NextResponse.json({
    survey,
    results: buildResults(options, votes),
    // Coppie opzione↔votante: i risultati sono pubblici e live, quindi il client
    // può pre-selezionare le scelte correnti di chi sta guardando.
    votes: votes.map((v) => ({ optionId: v.optionId, voterId: v.voterId })),
  });
}

/** Chiude (o riapre) un sondaggio. Solo chi l'ha creato. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const surveyId = parseInt(id);
  const body = await req.json();
  const actorId = Number(body?.actorId);
  const status = body?.status === "open" ? "open" : body?.status === "closed" ? "closed" : null;
  if (!status) return NextResponse.json({ error: "Stato non valido" }, { status: 400 });

  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, select: { createdById: true } });
  if (!survey) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });
  if (survey.createdById !== actorId) {
    return NextResponse.json({ error: "Solo chi ha creato il sondaggio può chiuderlo." }, { status: 403 });
  }

  await prisma.survey.update({ where: { id: surveyId }, data: { status } });
  return NextResponse.json({ ok: true, status });
}

/** Elimina un sondaggio. Solo chi l'ha creato. Opzioni e voti vanno in cascata. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const surveyId = parseInt(id);
  const actorId = Number(req.nextUrl.searchParams.get("actorId"));

  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, select: { createdById: true } });
  if (!survey) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });
  if (survey.createdById !== actorId) {
    return NextResponse.json({ error: "Solo chi ha creato il sondaggio può eliminarlo." }, { status: 403 });
  }

  await prisma.survey.delete({ where: { id: surveyId } });
  return NextResponse.json({ ok: true });
}
