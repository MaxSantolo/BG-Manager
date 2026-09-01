import { prisma } from "@/lib/prisma";
import { bggLogin } from "@/lib/bggAuth";
import { bggHeaders, decodeXmlEntities } from "@/lib/bgg";
import { isUniqueViolation } from "@/lib/dupCheck";
import { classifyFlags, wishlistPriority, isWishlistStatus, parseStatusConfig, type StatusDef } from "@/lib/status";

/**
 * Reads are authenticated with the BGG API key. The session cookie is only
 * added when we happen to have one (manual import with credentials) — the
 * xmlapi2 read endpoints accept the bearer token on its own.
 */
function readHeaders(cookie?: string): Record<string, string> {
  return cookie ? { ...bggHeaders, Cookie: cookie } : { ...bggHeaders };
}

/** Error carrying the HTTP status the route should answer with. */
export class BggSyncError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function bggSession(username: string, password: string): Promise<string> {
  try {
    return await bggLogin(username, password);
  } catch (err: unknown) {
    throw new BggSyncError(err instanceof Error ? err.message : "Errore login", 401);
  }
}

// ── Collection ────────────────────────────────────────────────────────────────

interface BggCollectionGame {
  bggId: number;
  collId: number | null;
  name: string;
  subtype: string;
  yearPublished: number | null;
  thumbnail: string | null;
  image: string | null;
  bggRating: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTime: number | null;
  status: string | null;      // collection status, null for wishlist items
  wishlistPriority: number | null;
}

function fixUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("//") ? `https:${url}` : url;
}

function subtypeToType(subtype: string): string {
  if (subtype === "boardgameexpansion") return "Espansione";
  if (subtype === "boardgameaccessory")  return "Accessorio";
  return "Base";
}

function parseCollectionXml(xml: string, config: StatusDef[]): BggCollectionGame[] {
  const games: BggCollectionGame[] = [];
  const itemRegex = /<item\s((?:[^>"]|"[^"]*")*?)>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRegex.exec(xml)) !== null) {
    const attrs = m[1], body = m[2];

    const objecttype = attrs.match(/\bobjecttype="([^"]+)"/)?.[1];
    if (objecttype !== "thing") continue;

    const bggId   = parseInt(attrs.match(/\bobjectid="(\d+)"/)?.[1] ?? "0");
    const collId  = parseInt(attrs.match(/\bcollid="(\d+)"/)?.[1] ?? "0") || null;
    const subtype = attrs.match(/\bsubtype="([^"]+)"/)?.[1] ?? "boardgame";
    if (!bggId) continue;

    const name = decodeXmlEntities(body.match(/<name[^>]*sortindex[^>]*>([^<]+)<\/name>/)?.[1]?.trim() ?? "");
    if (!name) continue;

    // The configured statuses drive classification. A collection status wins;
    // otherwise a wishlist-flagged item routes to Desiderata; anything else is
    // skipped (want-to-buy, want-to-play, bare rating).
    const statusAttrs = body.match(/<status\s([^>]*?)\/?>/)?.[1] ?? "";
    const key = classifyFlags(config, statusAttrs);
    let status: string | null = null;
    let wlPriority: number | null = null;
    if (key && !isWishlistStatus(config, key)) {
      status = key;
    } else if (/\bwishlist="1"/.test(statusAttrs)) {
      wlPriority = wishlistPriority(statusAttrs);
    } else {
      continue;
    }

    const yearPublished = parseInt(body.match(/<yearpublished>(\d+)<\/yearpublished>/)?.[1] ?? "0") || null;
    const thumbnail     = fixUrl(body.match(/<thumbnail>\s*([^<\s]+)\s*<\/thumbnail>/)?.[1] ?? null);
    const image         = fixUrl(body.match(/<image>\s*([^<\s]+)\s*<\/image>/)?.[1] ?? null);

    const statsAttrs    = body.match(/<stats\s([^>]*?)>/)?.[1] ?? "";
    const minPlayers    = parseInt(statsAttrs.match(/\bminplayers="(\d+)"/)?.[1] ?? "0") || null;
    const maxPlayers    = parseInt(statsAttrs.match(/\bmaxplayers="(\d+)"/)?.[1] ?? "0") || null;
    const playTime      = parseInt(statsAttrs.match(/\bplayingtime="(\d+)"/)?.[1] ?? "0") || null;
    const bggRating     = parseFloat(body.match(/<average\s+value="([^"]+)"/)?.[1] ?? "0") || null;

    games.push({
      bggId, collId, name, subtype, yearPublished, thumbnail, image, bggRating,
      minPlayers, maxPlayers, playTime,
      status,
      wishlistPriority: wlPriority,
    });
  }

  return games;
}

export interface CollectionSyncResult {
  imported: number;
  enriched: number;
  statusChanged: number;
  wishlistImported: number;
  total: number;
}

/** BGG answers 202 while it builds the collection export — retry with backoff. */
async function fetchCollectionXml(url: string, cookie?: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url, { cache: "no-store", headers: readHeaders(cookie) });
    if (res.status === 202) {
      await sleep(2000 + attempt * 1000);
      continue;
    }
    if (!res.ok) throw new BggSyncError(`BGG API error ${res.status}`, 502);
    return res.text();
  }
  throw new BggSyncError("BGG ha continuato a rispondere 202 dopo vari tentativi.", 504);
}

export async function syncCollection(username: string, cookie?: string): Promise<CollectionSyncResult> {
  const base = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&stats=1`;

  // The user-configurable status↔BGG mapping drives how items are classified.
  const settings = await prisma.settings.findUnique({ where: { id: 1 }, select: { statusConfig: true } });
  const statusConfig = parseStatusConfig(settings?.statusConfig);

  // No status filter: BGG ANDs them, so we pull the whole collection and keep
  // the items whose flags map to a status (own / prevowned / fortrade).
  const xml = await fetchCollectionXml(base, cookie);

  // The unfiltered response tags every item subtype="boardgame", so expansions
  // are only identifiable via a second, subtype-filtered request. Non-fatal:
  // if it fails we just fall back to typing everything as "Base".
  let expansionIds = new Set<number>();
  try {
    const expXml = await fetchCollectionXml(`${base}&subtype=boardgameexpansion`, cookie);
    expansionIds = new Set(
      [...expXml.matchAll(/\bobjectid="(\d+)"/g)].map(m => parseInt(m[1]))
    );
  } catch {
    // keep the empty set
  }

  const parsed    = parseCollectionXml(xml, statusConfig);
  const bggGames  = parsed.filter(g => g.status !== null);
  const wishlist  = parsed.filter(g => g.wishlistPriority !== null);

  // Load existing games by bggId so we can fill in missing fields without overwriting
  const existing = await prisma.game.findMany({
    where: { bggId: { in: bggGames.map(g => g.bggId) } },
    select: {
      id: true, bggId: true, status: true, bggCollId: true,
      thumbnail: true, image: true, bggRating: true,
      minPlayers: true, maxPlayers: true, playTime: true, yearPublished: true,
    },
  });
  const existingByBgg = new Map(existing.map(g => [g.bggId!, g]));

  let imported = 0, enriched = 0, statusChanged = 0;
  for (const g of bggGames) {
    const local = existingByBgg.get(g.bggId);
    if (local) {
      // Status is authoritative on BGG; everything else only fills local gaps,
      // so name/type/cost/sleeves/etc. are never overwritten.
      const patch: Record<string, unknown> = {};
      if (local.status !== g.status) patch.status = g.status;
      if (g.collId != null && local.bggCollId !== g.collId) patch.bggCollId = g.collId;
      if (local.thumbnail == null && g.thumbnail != null) patch.thumbnail = g.thumbnail;
      if (local.image == null && g.image != null) patch.image = g.image;
      if (local.bggRating == null && g.bggRating != null) patch.bggRating = g.bggRating;
      if (local.minPlayers == null && g.minPlayers != null) patch.minPlayers = g.minPlayers;
      if (local.maxPlayers == null && g.maxPlayers != null) patch.maxPlayers = g.maxPlayers;
      if (local.playTime == null && g.playTime != null) patch.playTime = g.playTime;
      if (local.yearPublished == null && g.yearPublished != null) patch.yearPublished = g.yearPublished;
      if (Object.keys(patch).length > 0) {
        await prisma.game.update({ where: { id: local.id }, data: patch });
        if (patch.status) statusChanged++;
        if (Object.keys(patch).length > (patch.status ? 1 : 0)) enriched++;
      }
      continue;
    }
    try {
      await prisma.game.create({
        data: {
          bggId:        g.bggId,
          bggCollId:    g.collId,
          name:         g.name,
          type:         expansionIds.has(g.bggId) ? "Espansione" : subtypeToType(g.subtype),
          status:       g.status!,
          thumbnail:    g.thumbnail,
          image:        g.image,
          bggRating:    g.bggRating,
          minPlayers:   g.minPlayers,
          maxPlayers:   g.maxPlayers,
          playTime:     g.playTime,
          yearPublished: g.yearPublished,
          designers:    "[]",
          mechanics:    "[]",
        },
      });
      imported++;
    } catch (err) {
      // A concurrent sync (two tabs / manual + auto) may have just created the
      // same bggId. The unique index rejects the duplicate — treat it as
      // already-imported rather than aborting the whole sync with a 500.
      if (!isUniqueViolation(err)) throw err;
    }
  }

  const wishlistImported = await syncWishlist(wishlist, expansionIds);

  return { imported, enriched, statusChanged, wishlistImported, total: bggGames.length };
}

/**
 * BGG wishlist → Desiderata. Strictly additive: it never deletes or rewrites a
 * local entry, because the app's wishlist is also maintained by hand and BGG
 * has no idea about the rows you added here.
 */
async function syncWishlist(items: BggCollectionGame[], expansionIds: Set<number>): Promise<number> {
  if (items.length === 0) return 0;

  const ids = items.map(g => g.bggId);
  const [alreadyWished, alreadyOwned] = await Promise.all([
    prisma.wishlistGame.findMany({ where: { bggId: { in: ids } }, select: { bggId: true } }),
    prisma.game.findMany({ where: { bggId: { in: ids } }, select: { bggId: true } }),
  ]);
  const skip = new Set([
    ...alreadyWished.map(w => w.bggId!),
    ...alreadyOwned.map(g => g.bggId!),   // already in the collection: not a wish
  ]);

  let created = 0;
  for (const g of items) {
    if (skip.has(g.bggId)) continue;
    try {
      await prisma.wishlistGame.create({
        data: {
          bggId:        g.bggId,
          name:         g.name,
          type:         expansionIds.has(g.bggId) ? "Espansione" : subtypeToType(g.subtype),
          desirability: 6 - (g.wishlistPriority ?? 3),
          thumbnail:    g.thumbnail,
          image:        g.image,
          bggRating:    g.bggRating,
          minPlayers:   g.minPlayers,
          maxPlayers:   g.maxPlayers,
          playTime:     g.playTime,
          yearPublished: g.yearPublished,
          designers:    "[]",
          mechanics:    "[]",
        },
      });
      created++;
    } catch (err) {
      // Concurrent sync already inserted this wishlist bggId — not fatal.
      if (!isUniqueViolation(err)) throw err;
    }
  }
  return created;
}

// ── Plays ─────────────────────────────────────────────────────────────────────

interface BggPlay {
  bggPlayId: number;
  date: string;
  quantity: number;
  duration: number | null;
  location: string | null;
  notes: string | null;
  incomplete: boolean;
  gameName: string;
  bggGameId: number | null;
  players: { name: string; username: string; score: string; win: boolean; color: string; team: string }[];
}

function parsePlaysXml(xml: string): { total: number; plays: BggPlay[] } {
  const totalMatch = xml.match(/\btotal="(\d+)"/);
  const total = totalMatch ? parseInt(totalMatch[1]) : 0;
  const plays: BggPlay[] = [];

  const playRegex = /<play\s((?:[^>"]|"[^"]*")*?)>([\s\S]*?)<\/play>/g;
  let m: RegExpExecArray | null;

  while ((m = playRegex.exec(xml)) !== null) {
    const attrs = m[1], body = m[2];
    const id = parseInt(attrs.match(/\bid="(\d+)"/)?.[1] ?? "0");
    if (!id) continue;

    const itemMatch = body.match(/<item\s[^>]*\bname="([^"]+)"[^>]*\bobjectid="(\d+)"/);
    const gameName  = itemMatch ? decodeXmlEntities(itemMatch[1]) : "";
    const bggGameId = itemMatch ? parseInt(itemMatch[2]) || null : null;
    const notes     = body.match(/<comments>([\s\S]*?)<\/comments>/)?.[1]?.trim() || null;

    const players: BggPlay["players"] = [];
    const playerRegex = /<player\s((?:[^>"]|"[^"]*")*?)(?:\/>|>)/g;
    let pm: RegExpExecArray | null;
    while ((pm = playerRegex.exec(body)) !== null) {
      const pa = pm[1];
      const name = pa.match(/\bname="([^"]*)"/)?.[1] ?? "";
      if (name) players.push({
        name, username: pa.match(/\busername="([^"]*)"/)?.[1] ?? "",
        score: pa.match(/\bscore="([^"]*)"/)?.[1] ?? "",
        win: /\bwin="1"/.test(pa), color: pa.match(/\bcolor="([^"]*)"/)?.[1] ?? "",
        team: pa.match(/\bteam="([^"]*)"/)?.[1] ?? "",
      });
    }

    plays.push({
      bggPlayId: id, date: attrs.match(/\bdate="([^"]+)"/)?.[1] ?? "",
      quantity: parseInt(attrs.match(/\bquantity="(\d+)"/)?.[1] ?? "1") || 1,
      duration: parseInt(attrs.match(/\blength="(\d+)"/)?.[1] ?? "0") || null,
      location: attrs.match(/\blocation="([^"]*)"/)?.[1] || null,
      incomplete: /\bincomplete="1"/.test(attrs),
      gameName, bggGameId, notes, players,
    });
  }
  return { total, plays };
}

export interface PlaysSyncResult { imported: number; unchanged: number; total: number }

export async function syncPlays(username: string, cookie?: string): Promise<PlaysSyncResult> {
  async function fetchPage(page: number): Promise<{ total: number; plays: BggPlay[] }> {
    const url = `https://boardgamegeek.com/xmlapi2/plays?username=${encodeURIComponent(username)}&page=${page}`;
    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await fetch(url, { cache: "no-store", headers: readHeaders(cookie) });
      if (res.status === 202) { await sleep(2000 + attempt * 1000); continue; }
      if (!res.ok) throw new BggSyncError(`BGG API error ${res.status}`, 502);
      return parsePlaysXml(await res.text());
    }
    throw new BggSyncError("BGG ha continuato a rispondere 202 dopo vari tentativi.", 504);
  }

  const allPlays: BggPlay[] = [];
  let page = 1, total = Infinity;

  while (allPlays.length < total && page <= 100) {
    const parsed = await fetchPage(page);
    total = parsed.total;
    if (parsed.plays.length === 0) break;
    allPlays.push(...parsed.plays);
    page++;
  }

  const games = await prisma.game.findMany({ select: { id: true, bggId: true } });
  const gamesByBggId = new Map(games.filter(g => g.bggId).map(g => [g.bggId!, g.id]));

  // Writes are one round-trip each, so re-writing the whole history on every
  // sync is what makes it slow. Load what we have and only touch what differs.
  const stored = await prisma.play.findMany({
    where:  { bggPlayId: { in: allPlays.map(p => p.bggPlayId).filter(Boolean) } },
    select: {
      bggPlayId: true, date: true, quantity: true, incomplete: true, gameName: true,
      bggGameId: true, gameId: true, duration: true, location: true, notes: true, players: true,
    },
  });
  const storedByPlayId = new Map(stored.map(p => [p.bggPlayId!, p]));

  let imported = 0, unchanged = 0;
  for (const play of allPlays) {
    if (!play.bggPlayId || !play.date) continue;
    const gameId = play.bggGameId ? (gamesByBggId.get(play.bggGameId) ?? null) : null;

    // Authoritative from BGG (always overwrite)
    const authoritative = {
      date: new Date(play.date),
      quantity: play.quantity,
      incomplete: play.incomplete,
      gameName: play.gameName,
      bggGameId: play.bggGameId,
      gameId,
    };
    // Optional from BGG: overwrite only if BGG actually provides them.
    // Otherwise keep whatever the user has locally (Prisma skips undefined).
    const optional = {
      duration: play.duration ?? undefined,
      location: play.location ?? undefined,
      notes:    play.notes    ?? undefined,
      players:  play.players.length ? JSON.stringify(play.players) : undefined,
    };

    // Same row already? Skip the write. Optional fields only count as a
    // difference when BGG actually sent one, mirroring the update semantics.
    // Dates are compared as calendar days: a BGG play date has no time part,
    // and TIMESTAMP columns round-trip shifted by the server's UTC offset.
    const local = storedByPlayId.get(play.bggPlayId);
    if (
      local &&
      local.date.toISOString().slice(0, 10) === play.date.slice(0, 10) &&
      local.quantity   === authoritative.quantity &&
      local.incomplete === authoritative.incomplete &&
      local.gameName   === authoritative.gameName &&
      local.bggGameId  === authoritative.bggGameId &&
      local.gameId     === authoritative.gameId &&
      (optional.duration === undefined || local.duration === optional.duration) &&
      (optional.location === undefined || local.location === optional.location) &&
      (optional.notes    === undefined || local.notes    === optional.notes) &&
      (optional.players  === undefined || local.players  === optional.players)
    ) {
      unchanged++;
      continue;
    }

    await prisma.play.upsert({
      where: { bggPlayId: play.bggPlayId },
      create: {
        bggPlayId: play.bggPlayId,
        ...authoritative,
        duration: play.duration,
        location: play.location,
        notes:    play.notes,
        players:  play.players.length ? JSON.stringify(play.players) : null,
      },
      update: { ...authoritative, ...optional },
    });
    imported++;
  }

  // App-authoritative deletions (hybrid sync): a play removed on the BGG website
  // is intentionally NOT pruned here — the app is the source of truth for what
  // exists. Deletions flow only app→BGG (the play DELETE route removes it there
  // first). Edits and brand-new plays still flow BGG→app above, so a play logged
  // or corrected directly on BGG is picked up; only deletions don't propagate back.
  return { imported, unchanged, total: allPlays.length };
}
