import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BggSyncError, bggSession, syncCollection } from "@/lib/bggSync";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username?.trim())
    return NextResponse.json({ error: "Username richiesto" }, { status: 400 });

  try {
    const user   = username.trim();
    // Persist the username like the plays import does, otherwise a collection-only
    // import leaves AutoSync (which needs it) doing nothing.
    await prisma.settings.upsert({
      where: { id: 1 }, update: { bggUsername: user }, create: { id: 1, bggUsername: user },
    });
    // The API key covers reads; a password just adds a session cookie.
    const cookie = password?.trim() ? await bggSession(user, password) : undefined;
    const result = await syncCollection(user, cookie);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof BggSyncError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
