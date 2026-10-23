import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Elenco sondaggi: aperti prima, poi per data. Con conteggi leggeri. */
export async function GET() {
  const surveys = await prisma.survey.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }], // "closed" < "open" alfabetico → ribaltiamo sotto
    select: {
      id: true, title: true, status: true, createdByName: true, createdAt: true,
      multiVote: true, maxPicks: true, proposersCanVoteOwn: true,
      _count: { select: { options: true, votes: true } },
    },
  });
  // Aperti in cima (lo status è testo, l'ordine SQL non basta).
  surveys.sort((a, b) =>
    (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) ||
    b.createdAt.getTime() - a.createdAt.getTime());
  return NextResponse.json({ surveys });
}

/** Crea un sondaggio con le sue regole. Chiunque può crearlo (è un ospite). */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const createdById = Number(body?.createdById);
  const createdByName = typeof body?.createdByName === "string" ? body.createdByName.trim() : "";

  if (!title) return NextResponse.json({ error: "Titolo richiesto" }, { status: 400 });
  if (!createdById || !createdByName) return NextResponse.json({ error: "Dì prima chi sei" }, { status: 400 });

  const multiVote = !!body?.multiVote;
  // maxPicks ha senso solo con multiVote; un valore <1 equivale a nessun tetto.
  const rawMax = Number(body?.maxPicks);
  const maxPicks = multiVote && Number.isFinite(rawMax) && rawMax >= 1 ? Math.floor(rawMax) : null;
  const proposersCanVoteOwn = !!body?.proposersCanVoteOwn;

  const survey = await prisma.survey.create({
    data: { title, createdById, createdByName, multiVote, maxPicks, proposersCanVoteOwn },
    select: { id: true },
  });
  return NextResponse.json({ id: survey.id });
}
