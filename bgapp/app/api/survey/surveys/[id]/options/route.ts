import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBggGame } from "@/lib/bgg";

export const dynamic = "force-dynamic";

/**
 * Proponi un gioco (da BoardGameGeek) in un sondaggio aperto. Un bggId una sola
 * volta per sondaggio. Nome, copertina e numero giocatori sono presi da BGG qui
 * e salvati come snapshot: voto, risultati e divisione in tavoli non rileggono
 * mai nulla, e l'area sondaggi non tocca la collezione.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const surveyId = parseInt(id);
  const body = await req.json();

  const proposedById = Number(body?.proposedById);
  const proposedByName = typeof body?.proposedByName === "string" ? body.proposedByName.trim() : "";
  const bggId = Number(body?.bggId);
  const fallbackName = typeof body?.gameName === "string" ? body.gameName.trim() : "";

  if (!proposedById || !proposedByName) return NextResponse.json({ error: "Dì prima chi sei" }, { status: 400 });
  if (!bggId) return NextResponse.json({ error: "Gioco non valido" }, { status: 400 });

  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, select: { status: true } });
  if (!survey) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });
  if (survey.status !== "open") return NextResponse.json({ error: "Il sondaggio è chiuso." }, { status: 409 });

  // Pre-controllo del doppione: 409 pulito senza dipendere dalla forma
  // dell'errore del DB (l'adapter Neon HTTP non espone il code P2002).
  const existing = await prisma.surveyOption.findFirst({
    where: { surveyId, bggId }, select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "Questo gioco è già tra le proposte." }, { status: 409 });

  // Snapshot da BGG. Se BGG non risponde (Cloudflare, rete), si ripiega sul nome
  // mandato dalla ricerca: proporre non deve fallire per un dettaglio mancante.
  const detail = await getBggGame(bggId).catch(() => null);
  const gameName = detail?.name || fallbackName;
  if (!gameName) return NextResponse.json({ error: "Gioco non valido" }, { status: 400 });

  const option = await prisma.surveyOption.create({
    data: {
      surveyId, bggId, gameName,
      gameThumbnail: detail?.thumbnail ?? null,
      minPlayers: detail?.minPlayers ?? null,
      maxPlayers: detail?.maxPlayers ?? null,
      proposedById, proposedByName,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: option.id });
}
