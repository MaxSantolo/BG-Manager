import { prisma } from "@/lib/prisma";

/**
 * Games with no recorded play.
 *
 * Two things make this less obvious than it looks:
 *  - plays link to a game either by gameId OR, when the sync couldn't resolve
 *    one, by bggGameId alone (30 of 337 plays at the time of writing). Counting
 *    only gameId would report games as never played when they have been.
 *  - `playedBefore` is the manual escape hatch for games played before plays
 *    were tracked, so the derived answer stays derived and still correctable.
 *
 * What counts is a box that is in the collection right now and can be played on
 * its own, so this is a WHITELIST, not a blacklist: only "InCollezione" gets in.
 * Sold, guest, pre-ordered and for-sale boxes all stay out by construction, and
 * so does any future custom status — a status nobody thought about here can no
 * longer leak into the list. Expansions are out too: they're played inside their
 * base game and would never have plays of their own ("Base + Espansione" stays,
 * it IS a base game).
 *
 * Deliberately stricter than the dashboard's ON_THE_SHELF, which counts every
 * box you own.
 */
const PLAYABLE_BOX = {
  status: "InCollezione",
  type: { not: "Espansione" },
};

export async function findNeverPlayed() {
  const [playedByGameId, playedByBggId, games] = await Promise.all([
    prisma.play.groupBy({ by: ["gameId"], where: { gameId: { not: null } } }),
    prisma.play.groupBy({ by: ["bggGameId"], where: { bggGameId: { not: null } } }),
    prisma.game.findMany({
      where: { ...PLAYABLE_BOX, playedBefore: false },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const byGameId = new Set(playedByGameId.map((r) => r.gameId!));
  const byBggId = new Set(playedByBggId.map((r) => r.bggGameId!));

  return games.filter((g) => !byGameId.has(g.id) && !(g.bggId != null && byBggId.has(g.bggId)));
}
