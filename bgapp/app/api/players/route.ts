import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBggUser } from "@/lib/bgg";

export const dynamic = "force-dynamic";

/** Most-played first — the picker should surface your regulars at the top. */
export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: [{ playCount: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ players });
}

export async function POST(req: NextRequest) {
  const { name, bggUsername } = await req.json();
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanUser = typeof bggUsername === "string" ? bggUsername.trim() : "";

  if (!cleanName) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });

  const existing = await prisma.player.findUnique({ where: { name: cleanName } });
  if (existing) return NextResponse.json(existing);

  // Anonymous players are the common case; only look BGG up when asked to.
  let avatarUrl: string | null = null;
  let avatarCheckedAt: Date | null = null;
  if (cleanUser) {
    const user = await getBggUser(cleanUser);
    if (!user.exists)
      return NextResponse.json({ error: `Utente BGG "${cleanUser}" non trovato` }, { status: 404 });
    avatarUrl = user.avatarUrl;
    avatarCheckedAt = new Date();
  }

  const player = await prisma.player.create({
    data: {
      name: cleanName,
      bggUsername: cleanUser || null,
      avatarUrl,
      avatarCheckedAt,
    },
  });
  return NextResponse.json(player, { status: 201 });
}
