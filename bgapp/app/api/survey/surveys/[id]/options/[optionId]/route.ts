import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Elimina un gioco proposto (e i suoi voti, in cascata). Può farlo chi l'ha
 * proposto o chi ha creato il sondaggio — così si ripulisce dagli scherzi.
 * Solo a sondaggio aperto: a classifica chiusa i risultati non si toccano.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; optionId: string }> },
) {
  const { id, optionId } = await params;
  const surveyId = parseInt(id);
  const optId = parseInt(optionId);
  const actorId = Number(req.nextUrl.searchParams.get("actorId"));

  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, select: { status: true, createdById: true } });
  if (!survey) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });
  if (survey.status !== "open") return NextResponse.json({ error: "Il sondaggio è chiuso." }, { status: 409 });

  const option = await prisma.surveyOption.findUnique({ where: { id: optId }, select: { surveyId: true, proposedById: true } });
  if (!option || option.surveyId !== surveyId) return NextResponse.json({ error: "Gioco non trovato" }, { status: 404 });

  if (actorId !== option.proposedById && actorId !== survey.createdById) {
    return NextResponse.json({ error: "Puoi togliere solo i giochi che hai proposto tu." }, { status: 403 });
  }

  await prisma.surveyOption.delete({ where: { id: optId } });
  return NextResponse.json({ ok: true });
}
