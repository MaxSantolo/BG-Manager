import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rebuildPlayers } from "@/lib/registry";

/**
 * Folds one player into another. The plays keep whatever names BGG recorded —
 * they are BGG's data and the next sync would overwrite a local rename anyway.
 * Instead the surviving player absorbs the duplicate's name as an alias, which
 * is what keeps rebuildPlayers() from recreating it on the next sync.
 */
export async function POST(req: NextRequest) {
  const { fromId, intoId } = await req.json();
  if (!fromId || !intoId || fromId === intoId)
    return NextResponse.json({ error: "Servono due giocatori diversi" }, { status: 400 });

  const [from, into] = await Promise.all([
    prisma.player.findUnique({ where: { id: Number(fromId) } }),
    prisma.player.findUnique({ where: { id: Number(intoId) } }),
  ]);
  if (!from || !into) return NextResponse.json({ error: "Giocatore non trovato" }, { status: 404 });

  const parse = (raw: string): string[] => {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter(x => typeof x === "string") : [];
    } catch {
      return [];
    }
  };

  const aliases = Array.from(new Set([
    ...parse(into.aliases),
    ...parse(from.aliases),
    from.name,
  ].filter(n => n !== into.name)));

  await prisma.player.update({
    where: { id: into.id },
    data: {
      aliases: JSON.stringify(aliases),
      // Keep whichever BGG account and avatar we actually have.
      bggUsername:     into.bggUsername ?? from.bggUsername,
      avatarUrl:       into.avatarUrl ?? from.avatarUrl,
      avatarCheckedAt: into.avatarCheckedAt ?? from.avatarCheckedAt,
    },
  });
  await prisma.player.delete({ where: { id: from.id } });

  // Recount so the merged player carries both names' plays.
  await rebuildPlayers();

  const merged = await prisma.player.findUnique({ where: { id: into.id } });
  return NextResponse.json({ ok: true, player: merged, absorbed: from.name });
}
