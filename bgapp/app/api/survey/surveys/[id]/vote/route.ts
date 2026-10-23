import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaTx } from "@/lib/prismaTx";
import { validateVote, buildResults, type SurveyRules } from "@/lib/survey";

export const dynamic = "force-dynamic";

/**
 * Registra il voto. Le regole del sondaggio sono applicate qui, lato server:
 * è l'autorità, il client può solo anticiparle. Rivotare sovrascrive: si
 * cancellano i voti precedenti di questo votante e si reinseriscono, in una
 * sola transazione.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const surveyId = parseInt(id);
  const body = await req.json();

  const voterId = Number(body?.voterId);
  const voterName = typeof body?.voterName === "string" ? body.voterName.trim() : "";

  // Ogni scelta porta un gradimento opzionale (1-5). Accetto sia il formato
  // ricco `picks:[{optionId, rating}]`, sia il vecchio `optionIds:[...]`.
  const rawPicks: { optionId: number; rating: number | null }[] = Array.isArray(body?.picks)
    ? body.picks.map((p: { optionId: unknown; rating: unknown }) => ({
        optionId: Number(p?.optionId),
        rating: p?.rating == null ? null : Number(p.rating),
      })).filter((p: { optionId: number }) => p.optionId)
    : Array.isArray(body?.optionIds)
      ? body.optionIds.map(Number).filter(Boolean).map((optionId: number) => ({ optionId, rating: null }))
      : [];
  const optionIds = rawPicks.map((p) => p.optionId);

  if (!voterId || !voterName) return NextResponse.json({ error: "Dì prima chi sei" }, { status: 400 });

  // Un gradimento, se c'è, è un intero 1-5.
  for (const p of rawPicks) {
    if (p.rating != null && (!Number.isInteger(p.rating) || p.rating < 1 || p.rating > 5)) {
      return NextResponse.json({ error: "Il gradimento va da 1 a 5." }, { status: 400 });
    }
  }

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { status: true, multiVote: true, maxPicks: true, proposersCanVoteOwn: true },
  });
  if (!survey) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });
  if (survey.status !== "open") return NextResponse.json({ error: "Il sondaggio è chiuso." }, { status: 409 });

  const options = await prisma.surveyOption.findMany({
    where: { surveyId },
    select: {
      id: true, bggId: true, gameName: true, gameThumbnail: true,
      minPlayers: true, maxPlayers: true,
      proposedById: true, proposedByName: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Votare niente è lecito: significa "annulla il mio voto". Si valida solo se
  // ci sono scelte; con zero scelte la transazione sotto si limita a cancellare.
  if (optionIds.length > 0) {
    const rules: SurveyRules = {
      multiVote: survey.multiVote,
      maxPicks: survey.maxPicks,
      proposersCanVoteOwn: survey.proposersCanVoteOwn,
    };
    const error = validateVote(rules, options, voterId, optionIds);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }

  await prismaTx.$transaction(async (tx) => {
    await tx.vote.deleteMany({ where: { surveyId, voterId } });
    if (rawPicks.length > 0) {
      await tx.vote.createMany({
        data: rawPicks.map((p) => ({ surveyId, optionId: p.optionId, voterId, voterName, rating: p.rating })),
      });
    }
  });

  const votes = await prisma.vote.findMany({
    where: { surveyId },
    select: { optionId: true, voterId: true, voterName: true, rating: true },
  });
  return NextResponse.json({
    results: buildResults(options, votes),
    votes: votes.map((v) => ({ optionId: v.optionId, voterId: v.voterId, rating: v.rating })),
  });
}
