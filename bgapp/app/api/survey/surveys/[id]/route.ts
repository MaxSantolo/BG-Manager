import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildResults, shouldAutoClose } from "@/lib/survey";

export const dynamic = "force-dynamic";

/** Dettaglio: sondaggio + regole + opzioni con conteggio voti + chi ha votato cosa. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const surveyId = parseInt(id);
  const askerId = Number(req.nextUrl.searchParams.get("voterId")) || null;

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: {
      id: true, title: true, status: true, createdById: true, createdByName: true, createdAt: true,
      playDate: true, multiVote: true, maxPicks: true, proposersCanVoteOwn: true, winnersCount: true,
      secret: true, closeAfterVoters: true, closeAt: true,
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
      select: { optionId: true, voterId: true, voterName: true, rating: true },
    }),
  ]);

  // Chiusura automatica "pigra": se l'ora è passata o hanno votato abbastanza,
  // qui si chiude davvero (una volta sola) prima di decidere cosa mostrare.
  const distinctVoters = new Set(votes.map((v) => v.voterId)).size;
  if (shouldAutoClose(survey, distinctVoters)) {
    await prisma.survey.update({ where: { id: surveyId }, data: { status: "closed" } });
    survey.status = "closed";
  }

  const results = buildResults(options, votes);
  const hidden = survey.secret && survey.status === "open"; // segreto + ancora aperto

  return NextResponse.json({
    survey,
    // Voto segreto: finché è aperto i risultati sono nascosti A TUTTI, lato
    // server (non solo in UI). Si vedono solo le opzioni, non i conteggi.
    results: hidden
      ? results.map((r) => ({ ...r, votes: 0, voterNames: [], avgRating: null, ratingCount: 0, ratingSum: 0, ratingDist: [0, 0, 0, 0, 0, 0] }))
      : results,
    // In segreto il richiedente riceve solo i PROPRI voti (per rivedere/correggere
    // la sua scelta); altrimenti tutti, come prima.
    votes: (hidden ? votes.filter((v) => v.voterId === askerId) : votes)
      .map((v) => ({ optionId: v.optionId, voterId: v.voterId, voterName: v.voterName, rating: v.rating })),
    hidden,
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
