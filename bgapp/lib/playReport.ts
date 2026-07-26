import { prisma } from "@/lib/prisma";
import { getBggGame } from "@/lib/bgg";
import { imageRatio } from "@/lib/imageSize";

export interface ReportGame {
  key: string;
  name: string;
  thumbnail: string | null;
  image: string | null;
  plays: number;
  /** width / height of the cover, so it can be laid out without cropping. */
  ratio: number;
}

export interface PlayReport {
  from: string;
  to: string;
  totalPlays: number;
  totalGames: number;
  totalMinutes: number;
  games: ReportGame[];
}

/**
 * Looks up covers for games with no local record. getBggGame caches for a day,
 * so a repeated report costs nothing; batched to stay polite to BGG and inside
 * the function timeout.
 */
async function fillMissingCovers(grouped: Map<string, ReportGame>, needed: Map<string, number>) {
  const entries = [...needed.entries()];
  const BATCH = 6;

  for (let i = 0; i < entries.length; i += BATCH) {
    await Promise.all(entries.slice(i, i + BATCH).map(async ([key, bggId]) => {
      try {
        const detail = await getBggGame(bggId);
        const target = grouped.get(key);
        if (detail && target) {
          target.thumbnail = detail.thumbnail ?? target.thumbnail;
          target.image     = detail.image ?? target.image;
        }
      } catch {
        // a missing cover just renders as a placeholder tile
      }
    }));
  }
}

/** Measures every cover so the collage can preserve each one's proportions. */
async function measureCovers(grouped: Map<string, ReportGame>) {
  const entries = [...grouped.values()].filter(g => g.thumbnail);
  const BATCH = 12;
  for (let i = 0; i < entries.length; i += BATCH) {
    await Promise.all(entries.slice(i, i + BATCH).map(async g => {
      g.ratio = await imageRatio(g.thumbnail!);
    }));
  }
}

/** Inclusive of the whole `to` day, which is what a person means by a range. */
function dayBounds(from: string, to: string) {
  return {
    gte: new Date(`${from}T00:00:00.000Z`),
    lte: new Date(`${to}T23:59:59.999Z`),
  };
}

/**
 * Games played in a period, most-played first, with a cover resolved from the
 * collection. Plays are grouped by the game they point at — falling back to the
 * BGG id and finally the recorded name, so guest games and one-offs still count.
 */
export async function buildPlayReport(from: string, to: string): Promise<PlayReport> {
  const plays = await prisma.play.findMany({
    where:  { date: dayBounds(from, to) },
    select: { quantity: true, duration: true, gameId: true, bggGameId: true, gameName: true },
  });

  // One lookup for every game these plays could refer to.
  const gameIds  = [...new Set(plays.map(p => p.gameId).filter((v): v is number => v != null))];
  const bggIds   = [...new Set(plays.map(p => p.bggGameId).filter((v): v is number => v != null))];
  const covers = await prisma.game.findMany({
    where:  { OR: [{ id: { in: gameIds } }, { bggId: { in: bggIds } }] },
    select: { id: true, bggId: true, name: true, thumbnail: true, image: true },
  });
  const byId    = new Map(covers.map(g => [g.id, g]));
  const byBggId = new Map(covers.filter(g => g.bggId != null).map(g => [g.bggId!, g]));

  const grouped = new Map<string, ReportGame>();
  const needsCover = new Map<string, number>();   // key -> bggId
  let totalPlays = 0, totalMinutes = 0;

  for (const p of plays) {
    const game = (p.gameId != null ? byId.get(p.gameId) : undefined)
      ?? (p.bggGameId != null ? byBggId.get(p.bggGameId) : undefined);

    const key = game ? `g${game.id}` : (p.bggGameId ? `b${p.bggGameId}` : `n${p.gameName}`);
    const prev = grouped.get(key);
    grouped.set(key, {
      key,
      name:      game?.name ?? p.gameName,
      thumbnail: game?.thumbnail ?? null,
      image:     game?.image ?? null,
      plays:     (prev?.plays ?? 0) + p.quantity,
      ratio:     prev?.ratio ?? 1,
    });

    // Played but not owned: no local row to take a cover from, so ask BGG.
    if (!game?.thumbnail && p.bggGameId) needsCover.set(key, p.bggGameId);

    totalPlays   += p.quantity;
    totalMinutes += (p.duration ?? 0) * p.quantity;
  }

  await fillMissingCovers(grouped, needsCover);
  await measureCovers(grouped);

  const games = [...grouped.values()].sort((a, b) => b.plays - a.plays || a.name.localeCompare(b.name));

  return { from, to, totalPlays, totalGames: games.length, totalMinutes, games };
}
