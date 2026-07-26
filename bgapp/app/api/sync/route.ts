import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BggSyncError, bggSession, syncCollection, syncPlays } from "@/lib/bggSync";
import { rebuildPlaces, rebuildPlayers } from "@/lib/registry";

export const maxDuration = 60;

/** Don't hit BGG again if we already synced this recently (manual sync can force). */
const COOLDOWN_MINUTES = 10;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  // Reads only need the API key + username; the password is optional and just
  // adds a session cookie when it happens to be saved.
  if (!settings?.bggUsername?.trim())
    return NextResponse.json({ skipped: "no-credentials" });

  if (!force && !settings.autoSyncOnStart)
    return NextResponse.json({ skipped: "disabled" });

  if (!force && settings.lastSyncAt) {
    const ageMinutes = (Date.now() - settings.lastSyncAt.getTime()) / 60_000;
    if (ageMinutes < COOLDOWN_MINUTES)
      return NextResponse.json({ skipped: "cooldown", lastSyncAt: settings.lastSyncAt });
  }

  const username = settings.bggUsername.trim();

  try {
    const cookie     = settings.bggPassword?.trim()
      ? await bggSession(username, settings.bggPassword)
      : undefined;
    const collection = await syncCollection(username, cookie);
    const plays      = await syncPlays(username, cookie);

    // Keep the pickers current with whatever the sync just pulled in, but only
    // when something actually changed — a no-op sync shouldn't pay for this.
    if (plays.imported > 0) {
      await rebuildPlaces();
      await rebuildPlayers();
    }

    const updated = await prisma.settings.update({
      where: { id: 1 },
      data:  { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      games:      collection,
      plays,
      lastSyncAt: updated.lastSyncAt,
    });
  } catch (err: unknown) {
    if (err instanceof BggSyncError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore durante la sincronizzazione" },
      { status: 500 }
    );
  }
}
