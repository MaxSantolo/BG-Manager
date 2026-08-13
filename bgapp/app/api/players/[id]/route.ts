import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBggUser } from "@/lib/bgg";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, bggUsername } = body;
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanUser = typeof bggUsername === "string" ? bggUsername.trim() : "";

  if (!cleanName) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });

  const current = await prisma.player.findUnique({ where: { id: parseInt(id) } });
  if (!current) return NextResponse.json({ error: "Giocatore non trovato" }, { status: 404 });

  // Re-resolve the avatar only when the BGG account actually changed.
  let avatarUrl = current.avatarUrl;
  let avatarCheckedAt = current.avatarCheckedAt;
  if (cleanUser !== (current.bggUsername ?? "")) {
    if (cleanUser) {
      const user = await getBggUser(cleanUser);
      if (!user.exists)
        return NextResponse.json({ error: `Utente BGG "${cleanUser}" non trovato` }, { status: 404 });
      avatarUrl = user.avatarUrl;
    } else {
      avatarUrl = null;
    }
    avatarCheckedAt = new Date();
  }

  // A manual image URL wins over the BGG avatar (for anonymous players, or to
  // override). Sending an empty string clears it. avatarCheckedAt is stamped so
  // the registry rebuild won't overwrite a manual image from BGG.
  if (typeof body.avatarUrl === "string") {
    avatarUrl = body.avatarUrl.trim() || null;
    avatarCheckedAt = new Date();
  }

  const player = await prisma.player.update({
    where: { id: parseInt(id) },
    data: { name: cleanName, bggUsername: cleanUser || null, avatarUrl, avatarCheckedAt },
  });
  return NextResponse.json(player);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.player.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
