import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BggSyncError, bggSession, syncPlays } from "@/lib/bggSync";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username?.trim()) return NextResponse.json({ error: "Username richiesto" }, { status: 400 });

  try {
    const user   = username.trim();
    // The API key covers reads; a password just adds a session cookie.
    const cookie = password?.trim() ? await bggSession(user, password) : undefined;
    const result = await syncPlays(user, cookie);

    await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, bggUsername: user },
      update: { bggUsername: user },
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof BggSyncError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
