import { prisma } from "@/lib/prisma";
import { getBggUser } from "@/lib/bgg";

interface StoredPlayer { name?: string; username?: string }

/**
 * Rebuilds the place registry from the locations recorded on plays, so places
 * imported from BGG show up in the picker without any manual step.
 */
export async function rebuildPlaces(): Promise<{ created: number; updated: number }> {
  const grouped = await prisma.play.groupBy({
    by: ["location"],
    _count: true,
    where: { location: { not: null } },
  });

  // Zero every count first, so a place that lost all its plays doesn't keep a
  // stale total (the loop below only touches places still present in history).
  await prisma.place.updateMany({ data: { playCount: 0 } });

  let created = 0, updated = 0;
  for (const row of grouped) {
    const name = row.location?.trim();
    if (!name) continue;

    const existing = await prisma.place.findUnique({ where: { name } });
    if (existing) {
      if (existing.playCount !== row._count)
        await prisma.place.update({ where: { id: existing.id }, data: { playCount: row._count } });
      updated++;
    } else {
      await prisma.place.create({ data: { name, playCount: row._count } });
      created++;
    }
  }
  return { created, updated };
}

/**
 * Rebuilds the player registry from the players recorded on plays. Avatars are
 * only looked up for BGG accounts we have never resolved, so re-runs are cheap.
 */
export async function rebuildPlayers(): Promise<{ created: number; updated: number; avatars: number }> {
  const plays = await prisma.play.findMany({
    where:  { players: { not: null } },
    select: { players: true },
  });

  const counts = new Map<string, { count: number; username: string | null }>();
  for (const play of plays) {
    let parsed: StoredPlayer[];
    try {
      parsed = JSON.parse(play.players!);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;

    for (const entry of parsed) {
      const name = entry?.name?.trim();
      if (!name) continue;
      const prev = counts.get(name);
      counts.set(name, {
        count: (prev?.count ?? 0) + 1,
        username: entry.username?.trim() || prev?.username || null,
      });
    }
  }

  // A merged-away spelling still appears in play history, so resolve names
  // through the alias table first — otherwise every rebuild undoes the merge.
  const known = await prisma.player.findMany({ select: { id: true, name: true, aliases: true } });
  const byAlias = new Map<string, number>();
  for (const p of known) {
    try {
      const list = JSON.parse(p.aliases);
      if (Array.isArray(list)) for (const a of list) if (typeof a === "string") byAlias.set(a, p.id);
    } catch {
      // malformed alias JSON: ignore, the canonical name still resolves
    }
  }

  const folded = new Map<string, { count: number; username: string | null }>();
  for (const [name, info] of counts) {
    const targetId = byAlias.get(name);
    const key = targetId ? (known.find(p => p.id === targetId)!.name) : name;
    const prev = folded.get(key);
    folded.set(key, {
      count: (prev?.count ?? 0) + info.count,
      username: prev?.username || info.username,
    });
  }

  // Zero every count first: a player who lost all their plays (e.g. after a
  // merge or delete) must not keep a stale total — the loop only touches players
  // still present in history.
  await prisma.player.updateMany({ data: { playCount: 0 } });

  let created = 0, updated = 0, avatars = 0;
  for (const [name, { count, username }] of folded) {
    const existing = await prisma.player.findUnique({ where: { name } });

    let avatarUrl = existing?.avatarUrl ?? null;
    let avatarCheckedAt = existing?.avatarCheckedAt ?? null;
    if (username && !avatarCheckedAt) {
      const user = await getBggUser(username);
      avatarUrl = user.avatarUrl;
      avatarCheckedAt = new Date();
      if (user.avatarUrl) avatars++;
    }

    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: { playCount: count, bggUsername: username ?? existing.bggUsername, avatarUrl, avatarCheckedAt },
      });
      updated++;
    } else {
      await prisma.player.create({
        data: { name, bggUsername: username, playCount: count, avatarUrl, avatarCheckedAt },
      });
      created++;
    }
  }
  return { created, updated, avatars };
}

/** Ensures a place exists after a play is saved, keeping its count accurate. */
export async function registerPlace(location: string | null | undefined): Promise<void> {
  const name = location?.trim();
  if (!name) return;

  const playCount = await prisma.play.count({ where: { location: name } });
  await prisma.place.upsert({
    where:  { name },
    create: { name, playCount },
    update: { playCount },
  });
}
