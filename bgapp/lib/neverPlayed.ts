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
 * Sold and guest games are out: this is about the boxes on the shelf. So are
 * expansions — they're played inside their base game and would never have plays
 * of their own, so they'd just pad the list ("Base + Espansione" stays: it IS a
 * base game).
 */
const ON_THE_SHELF = {
  status: { notIn: ["Venduto", "GiocatoEsterno"] },
  type: { not: "Espansione" },
};

export async function findNeverPlayed() {
  const [playedByGameId, playedByBggId, games] = await Promise.all([
    prisma.play.groupBy({ by: ["gameId"], where: { gameId: { not: null } } }),
    prisma.play.groupBy({ by: ["bggGameId"], where: { bggGameId: { not: null } } }),
    prisma.game.findMany({
      where: { ...ON_THE_SHELF, playedBefore: false },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const byGameId = new Set(playedByGameId.map((r) => r.gameId!));
  const byBggId = new Set(playedByBggId.map((r) => r.bggGameId!));

  return games.filter((g) => !byGameId.has(g.id) && !(g.bggId != null && byBggId.has(g.bggId)));
}
