import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { savePlayToBgg, deletePlayFromBgg, withBggTimeout, BggWriteError, BggTimeoutError } from "@/lib/bggWrite";
import { toBggDate, toBggPlayers } from "@/lib/playPayload";
import { registerPlace } from "@/lib/registry";

export const maxDuration = 60;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { date, quantity, duration, location, notes, incomplete, gameName, players } = body;

  const play = await prisma.play.update({
    where: { id: parseInt(id) },
    data: {
      date:       new Date(date),
      quantity:   quantity ?? 1,
      duration:   duration ?? null,
      location:   location ?? null,
      notes:      notes ?? null,
      incomplete: incomplete ?? false,
      gameName,
      players:    players?.length ? JSON.stringify(players) : null,
    },
  });

  await registerPlace(location);

  // Only plays that exist on BGG can be edited there.
  if (!play.bggPlayId || !play.bggGameId)
    return NextResponse.json({ ...play, bgg: { pushed: false } });

  try {
    await withBggTimeout(savePlayToBgg({
      bggGameId: play.bggGameId,
      bggPlayId: play.bggPlayId,
      date: toBggDate(date),
      quantity, duration, location, notes, incomplete,
      players: toBggPlayers(players),
    }));
    return NextResponse.json({ ...play, bgg: { pushed: true } });
  } catch (err) {
    const pending = err instanceof BggTimeoutError;
    return NextResponse.json({
      ...play,
      bgg: { pushed: false, pending, error: pending ? undefined : (err instanceof BggWriteError ? err.message : "Errore BGG") },
    });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const play = await prisma.play.findUnique({ where: { id: parseInt(id) } });
  if (!play) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  // Remove it on BGG first. Deleting locally while it still exists there would
  // just let the next sync import it straight back. Bounded so a slow phone
  // connection can't hang the request; on timeout we leave the local row and
  // let the next sync reconcile (it prunes plays no longer on BGG).
  if (play.bggPlayId) {
    try {
      await withBggTimeout(deletePlayFromBgg(play.bggPlayId));
    } catch (err) {
      const pending = err instanceof BggTimeoutError;
      return NextResponse.json(
        {
          error: pending ? "Sincronizzazione BGG lenta, riprova tra poco." : (err instanceof BggWriteError ? err.message : "Errore BGG"),
          hint:  "La partita esiste ancora su BGG: eliminandola solo qui verrebbe re-importata alla prossima sincronizzazione.",
        },
        { status: 409 }
      );
    }
  }

  await prisma.play.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true, bgg: { deleted: !!play.bggPlayId } });
}
