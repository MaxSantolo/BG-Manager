/**
 * Rivali e compagni di gioco: chi gioca con chi, chi batte chi.
 *
 * Modulo puro (nessun import): lo usano la pagina sul server e il confronto
 * testa a testa nel browser, sugli stessi record già ripuliti.
 *
 * Le regole, decise sui dati (oltre 330 partite su 390 hanno un vincitore e un vinto):
 *  - tutto è pesato su quantity, come nel resto dell'app;
 *  - "contesa" = almeno due persone, non cooperativa, qualcuno ha vinto e
 *    qualcuno no. Solo queste entrano nella % di vittorie e in "chi batte chi".
 *    Le partite in cui hanno vinto tutti, nessuno, o giocate da soli contano
 *    come partite e come compagnia, non come vittorie o sconfitte;
 *  - A batte B quando A ha vinto, B no, e non erano nella stessa squadra;
 *  - i nomi passano per l'anagrafica (alias e username BGG): "Max Santolo" è Max.
 *    Il giocatore anonimo resta in partita come avversario ma non ha una
 *    scheda e non può essere la nemesi di nessuno.
 */

export interface RivalPlay {
  id: number;
  date: string;              // "AAAA-MM-GG"
  q: number;                 // quantity
  game: string;
  gameId: number | null;     // per il link alla scheda
  coop: boolean;
  players: { name: string; win: boolean; team: string | null }[];
}

export const ANON = "Giocatore anonimo";

export interface RegistryPlayer { name: string; bggUsername: string | null; aliases: string[] }

/** Nome canonico da nome + username BGG della partita. */
export function canonicalizer(registry: RegistryPlayer[]) {
  const byName = new Map<string, string>();
  const byUser = new Map<string, string>();
  for (const p of registry) {
    byName.set(p.name.trim().toLowerCase(), p.name);
    for (const a of p.aliases) byName.set(a.trim().toLowerCase(), p.name);
    if (p.bggUsername) byUser.set(p.bggUsername.trim().toLowerCase(), p.name);
  }
  return (name: string | null | undefined, username?: string | null): string => {
    const n = (name ?? "").trim();
    if (!n || /^(giocatore\s+)?anonim|^anonymous/i.test(n)) return ANON;
    const u = (username ?? "").trim().toLowerCase();
    return (u && byUser.get(u)) || byName.get(n.toLowerCase()) || n;
  };
}

/** Dalle righe Play grezze ai record puliti: JSON letto, nomi canonici, doppioni fusi. */
export function toRivalPlays(
  rows: { id: number; date: string; quantity: number; gameName: string; gameId: number | null; coop: boolean; players: string | null }[],
  canon: ReturnType<typeof canonicalizer>,
): RivalPlay[] {
  const out: RivalPlay[] = [];
  for (const r of rows) {
    let raw: { name?: string; username?: string; win?: boolean | string; team?: string }[] = [];
    try { raw = r.players ? JSON.parse(r.players) : []; } catch { /* riga illeggibile: niente giocatori */ }
    if (!Array.isArray(raw) || raw.length === 0) continue;
    const byName = new Map<string, RivalPlay["players"][number]>();
    raw.forEach((x, i) => {
      const name = canon(x.name, x.username);
      const win = x.win === true || x.win === "true" || x.win === "1";
      const team = x.team?.trim() || null;
      // Più anonimi nella stessa partita sono persone diverse: chiavi distinte.
      const key = name === ANON ? `${ANON}#${i}` : name;
      const prev = byName.get(key);
      // Stessa persona scritta in due modi nella stessa partita: una sola, vince se una delle due ha vinto.
      byName.set(key, prev ? { ...prev, win: prev.win || win } : { name, win, team });
    });
    out.push({ id: r.id, date: r.date, q: r.quantity, game: r.gameName, gameId: r.gameId, coop: r.coop, players: [...byName.values()] });
  }
  return out;
}

export function isContested(p: RivalPlay): boolean {
  if (p.coop || p.players.length < 2) return false;
  const w = p.players.filter((x) => x.win).length;
  return w > 0 && w < p.players.length;
}

/** A ha battuto B in questa partita. */
export function beats(p: RivalPlay, a: string, b: string): boolean {
  if (!isContested(p)) return false;
  const pa = p.players.find((x) => x.name === a);
  const pb = p.players.find((x) => x.name === b);
  if (!pa || !pb || !pa.win || pb.win) return false;
  return !(pa.team && pa.team === pb.team);
}

const top = (m: Map<string, number>) => {
  let best: [string, number] | null = null;
  for (const e of m) if (!best || e[1] > best[1] || (e[1] === best[1] && e[0] < best[0])) best = e;
  return best ? { name: best[0], count: best[1] } : null;
};
const bump = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n);

export interface PlayerStats {
  name: string;
  plays: number;                  // tutte, pesate
  contested: number;              // contese
  wins: number;                   // vinte tra le contese
  lastPlayed: string;
  companion: { name: string; count: number } | null;  // con chi gioca di più
  nemesis: { name: string; count: number } | null;    // chi lo batte più spesso
  victim: { name: string; count: number } | null;     // chi batte più spesso
  favourite: { name: string; count: number } | null;  // gioco più giocato
  strongest: { name: string; wins: number; contested: number } | null; // miglior % (≥ 50%) con almeno 3 contese
}

export function playerStats(plays: RivalPlay[]): PlayerStats[] {
  type Acc = {
    plays: number; contested: number; wins: number; lastPlayed: string;
    with: Map<string, number>; beatenBy: Map<string, number>; beat: Map<string, number>;
    games: Map<string, number>; gameWins: Map<string, { w: number; c: number }>;
  };
  const acc = new Map<string, Acc>();
  const get = (n: string) => {
    let a = acc.get(n);
    if (!a) acc.set(n, a = { plays: 0, contested: 0, wins: 0, lastPlayed: "", with: new Map(), beatenBy: new Map(), beat: new Map(), games: new Map(), gameWins: new Map() });
    return a;
  };

  for (const p of plays) {
    const contested = isContested(p);
    for (const me of p.players) {
      if (me.name === ANON) continue;
      const a = get(me.name);
      a.plays += p.q;
      if (p.date > a.lastPlayed) a.lastPlayed = p.date;
      bump(a.games, p.game, p.q);
      if (contested) {
        a.contested += p.q;
        if (me.win) a.wins += p.q;
        const g = a.gameWins.get(p.game) ?? { w: 0, c: 0 };
        g.c += p.q; if (me.win) g.w += p.q;
        a.gameWins.set(p.game, g);
      }
      for (const other of p.players) {
        if (other.name === me.name || other.name === ANON) continue;
        bump(a.with, other.name, p.q);
        if (beats(p, other.name, me.name)) bump(a.beatenBy, other.name, p.q);
        if (beats(p, me.name, other.name)) bump(a.beat, other.name, p.q);
      }
    }
  }

  return [...acc].map(([name, a]) => {
    let strongest: PlayerStats["strongest"] = null;
    for (const [game, g] of a.gameWins) {
      if (g.c < 3) continue;
      const better = !strongest
        || g.w / g.c > strongest.wins / strongest.contested
        || (g.w / g.c === strongest.wins / strongest.contested && g.c > strongest.contested);
      if (better) strongest = { name: game, wins: g.w, contested: g.c };
    }
    return {
      name, plays: a.plays, contested: a.contested, wins: a.wins, lastPlayed: a.lastPlayed,
      companion: top(a.with), nemesis: top(a.beatenBy), victim: top(a.beat), favourite: top(a.games),
      // "Il suo gioco" deve essere uno in cui vince almeno metà delle volte.
      strongest: strongest && strongest.wins * 2 >= strongest.contested ? strongest : null,
    };
  }).sort((x, y) => y.plays - x.plays || x.name.localeCompare(y.name));
}

export interface HeadToHead {
  together: number;     // partite insieme (pesate)
  aWins: number;        // A ha battuto B
  bWins: number;        // B ha battuto A
  even: number;         // insieme ma senza un vincitore tra i due (squadra, pari, coop, nessun dato)
  games: { name: string; gameId: number | null; together: number; aWins: number; bWins: number }[];
  last: { date: string; game: string; winner: string | null } | null;
  streak: { name: string; count: number } | null;   // serie in corso tra i due, solo se ≥ 2
}

export function headToHead(plays: RivalPlay[], a: string, b: string): HeadToHead {
  const shared = plays
    .filter((p) => p.players.some((x) => x.name === a) && p.players.some((x) => x.name === b))
    .sort((x, y) => (x.date === y.date ? x.id - y.id : x.date < y.date ? -1 : 1));
  const games = new Map<string, HeadToHead["games"][number]>();
  let together = 0, aWins = 0, bWins = 0;
  let streak: { name: string; count: number } | null = null;
  for (const p of shared) {
    const aw = beats(p, a, b), bw = beats(p, b, a);
    together += p.q;
    if (aw) aWins += p.q;
    if (bw) bWins += p.q;
    const g = games.get(p.game) ?? { name: p.game, gameId: p.gameId, together: 0, aWins: 0, bWins: 0 };
    g.together += p.q; if (aw) g.aWins += p.q; if (bw) g.bWins += p.q;
    g.gameId ??= p.gameId;
    games.set(p.game, g);
    // La serie conta solo le sfide decise tra i due; un pari non la interrompe.
    if (aw || bw) {
      const w = aw ? a : b;
      streak = streak && streak.name === w ? { name: w, count: streak.count + p.q } : { name: w, count: p.q };
    }
  }
  const lastPlay = shared.at(-1);
  return {
    together, aWins, bWins, even: together - aWins - bWins,
    games: [...games.values()].sort((x, y) => y.together - x.together || x.name.localeCompare(y.name)),
    last: lastPlay
      ? { date: lastPlay.date, game: lastPlay.game, winner: beats(lastPlay, a, b) ? a : beats(lastPlay, b, a) ? b : null }
      : null,
    streak: streak && streak.count >= 2 ? streak : null,
  };
}
