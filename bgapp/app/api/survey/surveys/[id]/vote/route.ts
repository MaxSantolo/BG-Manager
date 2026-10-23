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
  const optionIds: number[] = Array.isArray(body?.optionIds) ? body.optionIds.map(Number).filter(Boolean) : [];

  if (!voterId || !voterName) return NextResponse.json({ error: "Dì prima chi sei" }, { status: 400 });

  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { status: true, multiVote: true, maxPicks: true, proposersCanVoteOwn: true },
  });
  if (!survey) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });
  if (survey.status !== "open") return NextResponse.json({ error: "Il sondaggio è chiuso." }, { status: 409 });

  const options = await prisma.surveyOption.findMany({
    where: { surveyId },
    select: {
      id: true, gameId: true, gameName: true, gameThumbnail: true,
      proposedById: true, proposedByName: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const rules: SurveyRules = {
    multiVote: survey.multiVote,
    maxPicks: survey.maxPicks,
    proposersCanVoteOwn: survey.proposersCanVoteOwn,
  };
  const error = validateVote(rules, options, voterId, optionIds);
  if (error) return NextResponse.json({ error }, { status: 400 });

  await prismaTx.$transaction(async (tx) => {
    await tx.vote.deleteMany({ where: { surveyId, voterId } });
    if (optionIds.length > 0) {
      await tx.vote.createMany({
        data: optionIds.map((optionId) => ({ surveyId, optionId, voterId, voterName })),
      });
    }
  });

  const votes = await prisma.vote.findMany({
    where: { surveyId },
    select: { optionId: true, voterId: true, voterName: true },
  });
  return NextResponse.json({
    results: buildResults(options, votes),
    votes: votes.map((v) => ({ optionId: v.optionId, voterId: v.voterId })),
  });
}
