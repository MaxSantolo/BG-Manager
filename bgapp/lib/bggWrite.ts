import { prisma } from "@/lib/prisma";
import { bggLogin } from "@/lib/bggAuth";
import { getBggUser } from "@/lib/bgg";
import { flagsForStatus, parseStatusConfig, type StatusDef } from "@/lib/status";

/**
 * Writing to BGG goes through geekplay.php, the site's own AJAX endpoint —
 * the XML API is read-only. It needs the session cookies from login/api/v1;
 * without them Cloudflare answers with a challenge instead of the app.
 */
const GEEKPLAY_URL = "https://boardgamegeek.com/geekplay.php";

export interface BggPlayPlayer {
  name: string;
  username?: string | null;
  score?: string | null;
  win?: boolean;
  color?: string | null;
  new?: boolean;
  rating?: number;
  startposition?: string | null;
  team?: string | null;
}

export interface BggPlayInput {
  bggGameId: number;
  date: string;            // YYYY-MM-DD
  quantity?: number;
  duration?: number | null;
  location?: string | null;
  notes?: string | null;
  incomplete?: boolean;
  players?: BggPlayPlayer[];
  /** Set to update an existing play instead of creating one. */
  bggPlayId?: number | null;
}

export class BggWriteError extends Error {}

/** Thrown when there is no password saved — the caller decides whether that's fatal. */
export class BggNotConfiguredError extends BggWriteError {}

/** Thrown when the BGG round-trip runs past its budget — the local write already stands. */
export class BggTimeoutError extends BggWriteError {}

/**
 * Bounds a BGG operation so a slow phone connection can never hold a save open.
 * The local DB write has already committed by the time this runs, so on timeout
 * we abandon the push and let the next sync reconcile — the user's save is safe
 * either way. Default budget leaves comfortable room under the 60s function cap.
 */
export async function withBggTimeout<T>(op: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new BggTimeoutError("Timeout BGG")), ms);
  });
  try {
    return await Promise.race([op, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function credentials(): Promise<{ username: string; cookie: string }> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const username = settings?.bggUsername?.trim();
  const password = settings?.bggPassword?.trim();

  if (!username || !password)
    throw new BggNotConfiguredError("Credenziali BGG non configurate: salvato solo in locale.");

  try {
    return { username, cookie: await bggLogin(username, password) };
  } catch (err: unknown) {
    throw new BggWriteError(err instanceof Error ? err.message : "Login BGG fallito");
  }
}

async function sessionCookie(): Promise<string> {
  return (await credentials()).cookie;
}

async function geekplay(cookie: string, body: Record<string, unknown>): Promise<string> {
  const res = await fetch(GEEKPLAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  // A Cloudflare challenge comes back as HTML rather than the endpoint's JSON.
  if (res.headers.get("cf-mitigated") || text.trimStart().startsWith("<"))
    throw new BggWriteError("BGG ha risposto con una verifica del browser invece che con l'API.");

  if (!res.ok) throw new BggWriteError(`BGG ha risposto ${res.status}`);
  return text;
}

/**
 * Creates or updates a play on BGG. Returns the play id BGG assigns, which is
 * what we store as Play.bggPlayId so the next sync recognises it as the same
 * play instead of duplicating it.
 */
export async function savePlayToBgg(input: BggPlayInput): Promise<number> {
  const cookie = await sessionCookie();

  const text = await geekplay(cookie, {
    ajax: 1,
    action: "save",
    version: 2,
    objecttype: "thing",
    objectid: input.bggGameId,
    ...(input.bggPlayId ? { playid: input.bggPlayId } : {}),
    playdate:  input.date,
    dateinput: input.date,
    length:    input.duration ?? 0,
    location:  input.location ?? "",
    quantity:  input.quantity ?? 1,
    incomplete: input.incomplete ? 1 : 0,
    nowinstats: 0,
    comments:  input.notes ?? "",
    players: (input.players ?? []).map(p => ({
      username:      p.username ?? "",
      name:          p.name,
      score:         p.score ?? "",
      win:           p.win ? 1 : 0,
      new:           p.new ? 1 : 0,
      rating:        p.rating ?? 0,
      color:         p.color ?? "",
      startposition: p.startposition ?? "",
      team:          p.team ?? "",
    })),
  });

  let parsed: { playid?: string | number; error?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BggWriteError("Risposta di BGG non leggibile.");
  }

  if (parsed.error) throw new BggWriteError(parsed.error);

  const playid = Number(parsed.playid);
  if (!playid) throw new BggWriteError("BGG non ha restituito un id partita.");
  return playid;
}

// ── Collection status ─────────────────────────────────────────────────────────

/**
 * Collection edits do NOT go through geekcollection.php — that endpoint is
 * behind a Cloudflare challenge even with a valid session. The JSON API is
 * reachable: GET the item, change its flags, PUT it back wrapped in `item`.
 */
const COLLECTION_ITEM_URL = (collId: number) =>
  `https://boardgamegeek.com/api/collectionitems/${collId}`;

/** Loads the user-configured status↔BGG mapping (falls back to built-in defaults). */
async function loadStatusConfig(): Promise<StatusDef[]> {
  const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { statusConfig: true } });
  return parseStatusConfig(s?.statusConfig);
}

/** app status key → BGG flags per the configured mapping, or null if unmapped. */
export async function bggFlagsForStatus(status: string): Promise<Record<string, boolean> | null> {
  return flagsForStatus(await loadStatusConfig(), status);
}

/** Cheap guard for callers: does this status push to BGG at all? */
export async function statusMapsToBgg(status: string): Promise<boolean> {
  return (await bggFlagsForStatus(status)) !== null;
}

async function collectionItem(cookie: string, collId: number): Promise<Record<string, unknown>> {
  const res = await fetch(COLLECTION_ITEM_URL(collId), { cache: "no-store", headers: { Cookie: cookie } });
  const text = await res.text();
  if (res.headers.get("cf-mitigated") || text.trimStart().startsWith("<"))
    throw new BggWriteError("BGG ha risposto con una verifica del browser invece che con l'API.");
  if (!res.ok) throw new BggWriteError(`BGG ha risposto ${res.status} leggendo la collezione`);

  try {
    const parsed = JSON.parse(text);
    const item = parsed.item ?? parsed;
    if (!item?.collid) throw new Error("no item");
    return item as Record<string, unknown>;
  } catch {
    throw new BggWriteError("Risposta di BGG non leggibile.");
  }
}

async function putCollectionItem(cookie: string, collId: number, item: Record<string, unknown>) {
  const res = await fetch(COLLECTION_ITEM_URL(collId), {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", Cookie: cookie },
    body: JSON.stringify({ item }),   // the API only accepts the wrapped form
  });
  const text = await res.text();
  if (res.headers.get("cf-mitigated") || text.trimStart().startsWith("<"))
    throw new BggWriteError("BGG ha risposto con una verifica del browser invece che con l'API.");
  if (!res.ok) throw new BggWriteError(`BGG ha rifiutato la modifica (${res.status})`);
}

/**
 * Pushes a status change to BGG. Only the status flags are touched — rating,
 * comments, price paid and the rest of the entry are echoed back untouched.
 */
export async function updateCollectionStatusOnBgg(collId: number, status: string): Promise<void> {
  const flags = await bggFlagsForStatus(status);
  if (!flags) return;

  const cookie = await sessionCookie();
  const item = await collectionItem(cookie, collId);
  await putCollectionItem(cookie, collId, { ...item, status: flags });
}

interface CollectionLookupItem {
  collid?: string | number;
  user?: { username?: string } | string;
}

/**
 * Result of looking up whether a game is already in the user's BGG collection.
 * "unknown" (lookup failed) is deliberately distinct from "absent" (confirmed
 * not there): creating on "unknown" is exactly what mints duplicate entries.
 */
type CollLookup =
  | { state: "found"; collId: number }
  | { state: "absent" }
  | { state: "unknown" };

/**
 * Without a userid filter this endpoint returns one page of *every* user's
 * entry for the game, so on a popular title ours may not be on it — which would
 * look like "not in your collection". So we require the userid filter: if we
 * can't resolve the user id, or the request fails, the answer is "unknown", not
 * "absent" — the caller must not create in that case.
 */
async function findOwnColl(cookie: string, username: string, bggId: number): Promise<CollLookup> {
  const user = await getBggUser(username);
  if (!user.id) return { state: "unknown" };   // can't scope the query → don't guess

  let res: Response;
  try {
    res = await fetch(
      `https://boardgamegeek.com/api/collections?objecttype=thing&objectid=${bggId}&userid=${user.id}`,
      { cache: "no-store", headers: { Cookie: cookie } }
    );
  } catch {
    return { state: "unknown" };
  }
  if (!res.ok) return { state: "unknown" };

  try {
    const data = await res.json();
    const items: CollectionLookupItem[] = data.items ?? [];
    const mine = items.find(i => {
      const u = typeof i.user === "string" ? i.user : i.user?.username;
      return u?.toLowerCase() === username.toLowerCase();
    });
    if (mine?.collid) return { state: "found", collId: Number(mine.collid) };
    return { state: "absent" };
  } catch {
    return { state: "unknown" };
  }
}

/**
 * Makes sure the game exists in your BGG collection with the given status, and
 * returns its collection id. Looks first so re-running can't create a second
 * entry for the same game; creates only when there genuinely isn't one.
 */
export async function ensureCollectionItemOnBgg(bggId: number, status: string): Promise<number | null> {
  const flags = await bggFlagsForStatus(status);
  if (!flags) return null;

  const { username, cookie } = await credentials();

  const lookup = await findOwnColl(cookie, username, bggId);
  if (lookup.state === "found") {
    const item = await collectionItem(cookie, lookup.collId);
    await putCollectionItem(cookie, lookup.collId, { ...item, status: flags });
    return lookup.collId;
  }
  // Couldn't confirm it's absent — refuse to create, or we'd risk a duplicate.
  // The game is already saved locally; the next sync reconciles the BGG side.
  if (lookup.state === "unknown")
    throw new BggWriteError("Impossibile verificare la collezione BGG; riprovo alla prossima sincronizzazione.");

  const res = await fetch("https://boardgamegeek.com/api/collectionitems", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", Cookie: cookie },
    // objectid must be a string here; a number is rejected as "Invalid item".
    body: JSON.stringify({ item: { objecttype: "thing", objectid: String(bggId), status: flags } }),
  });
  const text = await res.text();
  if (res.headers.get("cf-mitigated") || text.trimStart().startsWith("<"))
    throw new BggWriteError("BGG ha risposto con una verifica del browser invece che con l'API.");
  if (!res.ok) throw new BggWriteError(`BGG non ha accettato il gioco (${res.status})`);

  // The create response carries no id, so read it back. If the readback can't
  // confirm it, leave the id null — the create already succeeded and the next
  // sync will fill it in — but never treat that as "absent" and re-create.
  const after = await findOwnColl(cookie, username, bggId);
  return after.state === "found" ? after.collId : null;
}

/**
 * Removes the entry from your BGG collection outright. Used when a game is
 * deleted here, so the next sync can't import it straight back. A real DELETE
 * rather than blanking the flags, which would leave a ghost entry behind.
 */
export async function clearCollectionStatusOnBgg(collId: number): Promise<void> {
  const cookie = await sessionCookie();
  const res = await fetch(COLLECTION_ITEM_URL(collId), {
    method: "DELETE",
    headers: { "X-Requested-With": "XMLHttpRequest", Cookie: cookie },
  });
  const text = await res.text();
  if (res.headers.get("cf-mitigated") || text.trimStart().startsWith("<"))
    throw new BggWriteError("BGG ha risposto con una verifica del browser invece che con l'API.");
  if (!res.ok) throw new BggWriteError(`BGG non ha rimosso il gioco (${res.status})`);
}

export async function deletePlayFromBgg(bggPlayId: number): Promise<void> {
  const cookie = await sessionCookie();
  const text = await geekplay(cookie, { ajax: 1, action: "delete", playid: bggPlayId, finalize: 1 });

  try {
    const parsed = JSON.parse(text);
    // Already gone (e.g. a retry after a half-completed delete) is success, not
    // a failure — the goal state is "not on BGG", and it's there.
    if (parsed.error && /not\s*found|does\s*not\s*exist|invalid/i.test(String(parsed.error))) return;
    if (parsed.error) throw new BggWriteError(parsed.error);
    if (parsed.success !== true) throw new BggWriteError("BGG non ha confermato l'eliminazione.");
  } catch (err) {
    if (err instanceof BggWriteError) throw err;
    throw new BggWriteError("Risposta di BGG non leggibile.");
  }
}
