import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Elenco sondaggi: aperti prima, poi per data. Con conteggi leggeri. */
export async function GET() {
  const surveys = await prisma.survey.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }], // "closed" < "open" alfabetico → ribaltiamo sotto
    select: {
      id: true, title: true, status: true, createdByName: true, createdAt: true,
      playDate: true, multiVote: true, maxPicks: true, proposersCanVoteOwn: true, winnersCount: true,
      secret: true, closeAfterVoters: true, closeAt: true,
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

  const rawWinners = Number(body?.winnersCount);
  const winnersCount = Number.isFinite(rawWinners) && rawWinners >= 1 ? Math.floor(rawWinners) : null;

  const secret = !!body?.secret;
  const rawVoters = Number(body?.closeAfterVoters);
  const closeAfterVoters = Number.isFinite(rawVoters) && rawVoters >= 1 ? Math.floor(rawVoters) : null;
  // closeAt arriva già come ISO (il browser converte il datetime-local nel suo
  // fuso): lo accettiamo solo se è una data valida e futura.
  const closeAtRaw = typeof body?.closeAt === "string" ? new Date(body.closeAt) : null;
  const closeAt = closeAtRaw && !isNaN(closeAtRaw.getTime()) ? closeAtRaw : null;

  // La data è un giorno di calendario (vedi lib/dates): la fissiamo a mezzogiorno
  // UTC così non slitta di un giorno quando viene riletta in fusi diversi.
  const playDateStr = typeof body?.playDate === "string" ? body.playDate.trim() : "";
  const playDate = /^\d{4}-\d{2}-\d{2}$/.test(playDateStr) ? new Date(`${playDateStr}T12:00:00.000Z`) : null;

  const survey = await prisma.survey.create({
    data: { title, createdById, createdByName, multiVote, maxPicks, proposersCanVoteOwn, winnersCount, playDate,
      secret, closeAfterVoters, closeAt },
    select: { id: true },
  });
  return NextResponse.json({ id: survey.id });
}
