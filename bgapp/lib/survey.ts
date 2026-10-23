/**
 * Tipi e logica pura dei sondaggi, condivisi tra API e pagine.
 * Le regole sono per-sondaggio e decise alla creazione; qui vivono il loro
 * controllo (validateVote) e il calcolo dei risultati (buildResults), così la
 * stessa verifica vale ovunque e il server resta l'autorità.
 */

export interface SurveyRules {
  multiVote: boolean;
  maxPicks: number | null;          // tetto scelte se multiVote; null = illimitato
  proposersCanVoteOwn: boolean;     // false = "chi propone non può votare il proprio gioco"
}

export interface OptionResult {
  id: number;
  bggId: number;
  gameName: string;
  gameThumbnail: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  proposedById: number;
  proposedByName: string;
  votes: number;
  voterNames: string[];
  avgRating: number | null;   // media dei gradimenti dati a questo gioco
  ratingCount: number;        // quanti hanno dato un gradimento
  ratingSum: number;          // totale stelle, per la classifica
  ratingDist: number[];       // conteggio per stella: indici 1..5 usati (0 ignorato)
}

interface VoteRow { optionId: number; voterId: number; voterName: string; rating?: number | null }
interface OptionRow {
  id: number; bggId: number; gameName: string; gameThumbnail: string | null;
  minPlayers: number | null; maxPlayers: number | null;
  proposedById: number; proposedByName: string;
}

/** Conteggio voti per opzione + chi ha votato cosa, in ordine di classifica. */
export function buildResults(options: OptionRow[], votes: VoteRow[]): OptionResult[] {
  const byOption = new Map<number, { n: number; names: string[]; rSum: number; rN: number; dist: number[] }>();
  for (const o of options) byOption.set(o.id, { n: 0, names: [], rSum: 0, rN: 0, dist: [0, 0, 0, 0, 0, 0] });
  for (const v of votes) {
    const slot = byOption.get(v.optionId);
    if (!slot) continue;
    slot.n++; slot.names.push(v.voterName);
    if (v.rating != null) {
      slot.rSum += v.rating; slot.rN++;
      const k = Math.min(5, Math.max(1, Math.round(v.rating)));
      slot.dist[k]++;
    }
  }
  return options
    .map((o) => {
      const s = byOption.get(o.id)!;
      return {
        ...o,
        votes: s.n,
        voterNames: s.names,
        avgRating: s.rN > 0 ? Math.round((s.rSum / s.rN) * 10) / 10 : null,
        ratingCount: s.rN,
        ratingSum: s.rSum,
        ratingDist: s.dist,
      };
    })
    .sort((a, b) => rankCompare(a, b) || a.gameName.localeCompare(b.gameName, "it"));
}

/**
 * Ordine di classifica fra due giochi: prima per numero di voti; a pari voti
 * vince chi ha più stelle alte (5★, poi 4★…). Ritorna 0 per un pari merito
 * vero. Idea presa dalla versione di Simone (Limone).
 */
export function rankCompare(a: OptionResult, b: OptionResult): number {
  if (b.votes !== a.votes) return b.votes - a.votes;
  for (let k = 5; k >= 1; k--) {
    const d = (b.ratingDist[k] ?? 0) - (a.ratingDist[k] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Valida le scelte di un votante contro le regole del sondaggio.
 * Ritorna un messaggio d'errore (stringa) o null se tutto ok.
 */
export function validateVote(
  rules: SurveyRules,
  options: OptionRow[],
  voterId: number,
  pickedOptionIds: number[],
): string | null {
  if (pickedOptionIds.length === 0) return "Scegli almeno un gioco.";

  const uniquePicks = [...new Set(pickedOptionIds)];
  if (uniquePicks.length !== pickedOptionIds.length) return "Hai scelto due volte lo stesso gioco.";

  const byId = new Map(options.map((o) => [o.id, o]));
  for (const id of uniquePicks) {
    if (!byId.has(id)) return "Una delle scelte non appartiene a questo sondaggio.";
  }

  if (!rules.multiVote && uniquePicks.length > 1) return "Questo sondaggio ammette una sola scelta.";
  if (rules.multiVote && rules.maxPicks != null && uniquePicks.length > rules.maxPicks) {
    return `Puoi scegliere al massimo ${rules.maxPicks} giochi.`;
  }

  if (!rules.proposersCanVoteOwn) {
    for (const id of uniquePicks) {
      if (byId.get(id)!.proposedById === voterId) {
        return "Non puoi votare un gioco che hai proposto tu.";
      }
    }
  }

  return null;
}

/** Descrizione testuale delle regole, per mostrarle a chi vota. */
export function describeRules(rules: SurveyRules): string {
  const parts: string[] = [];
  if (rules.multiVote) {
    parts.push(rules.maxPicks != null ? `Scelte multiple (max ${rules.maxPicks})` : "Scelte multiple");
  } else {
    parts.push("Una sola scelta");
  }
  parts.push(rules.proposersCanVoteOwn ? "puoi votare i tuoi giochi" : "non voti i tuoi giochi");
  return parts.join(" · ");
}

// ─── Proposta di divisione in tavoli ───────────────────────────────────────

export interface VoteDetail { optionId: number; voterName: string; rating: number | null }

export interface GameTable {
  bggId: number;
  gameName: string;
  gameThumbnail: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  players: string[];
  short: boolean;   // sotto il minimo di giocatori
}
export interface RankedGame extends OptionResult { rank: number; winner: boolean }
export interface TablePlan {
  ranking: RankedGame[];       // classifica completa, con i vincitori marcati
  tables: GameTable[];
  unseated: string[];          // presenti il cui gioco non ha fatto tavolo
}

/**
 * Proposta — non verità — di come dividere i presenti in tavoli, da fare alla
 * CHIUSURA del sondaggio. È un'euristica, pensata per essere corretta a mano.
 *
 * Passi (come stabilito):
 *  1. classifica dei giochi per totale voti, poi totale stelle;
 *  2. i primi `winnersCount` vincono e diventano i tavoli (null = tutti i
 *     giochi votati);
 *  3. ogni persona va al tavolo vincitore che ha gradito di più (stelle che gli
 *     ha dato), rispettando il max giocatori; chi trabocca passa al successivo
 *     per gradimento. Chi non ha votato nessun vincitore resta senza tavolo.
 */
export function proposeTables(
  results: OptionResult[],
  votes: VoteDetail[],
  winnersCount: number | null,
): TablePlan {
  // 1. Classifica: voti, poi spareggio sulle stelle alte (vedi rankCompare).
  const ranked = [...results].sort((a, b) =>
    rankCompare(a, b) || a.gameName.localeCompare(b.gameName, "it"));
  const cut = winnersCount && winnersCount > 0 ? winnersCount : ranked.length;
  const ranking: RankedGame[] = ranked.map((o, i) => ({
    ...o, rank: i + 1, winner: i < cut && o.votes > 0,
  }));

  const winners = ranking.filter((r) => r.winner);
  const rankIndex = new Map(winners.map((o, i) => [o.id, i]));
  const winnerById = new Map(winners.map((o) => [o.id, o]));

  // 2. Preferenze di ciascuno fra i giochi vincitori che ha votato, per
  //    gradimento (stelle) decrescente, poi per posizione in classifica.
  const prefByVoter = new Map<string, { optionId: number; rating: number }[]>();
  const allVoters = new Set<string>();
  for (const v of votes) {
    allVoters.add(v.voterName);
    if (!winnerById.has(v.optionId)) continue;
    if (!prefByVoter.has(v.voterName)) prefByVoter.set(v.voterName, []);
    prefByVoter.get(v.voterName)!.push({ optionId: v.optionId, rating: v.rating ?? 0 });
  }
  for (const list of prefByVoter.values()) {
    list.sort((a, b) => b.rating - a.rating || rankIndex.get(a.optionId)! - rankIndex.get(b.optionId)!);
  }

  // 3. Chi ha una preferenza più forte (gradimento top più alto) sceglie prima.
  const voters = [...prefByVoter.keys()].sort((a, b) => {
    const ra = prefByVoter.get(a)![0]?.rating ?? 0;
    const rb = prefByVoter.get(b)![0]?.rating ?? 0;
    return rb - ra || a.localeCompare(b);
  });
  const seats = new Map<number, string[]>(winners.map((o) => [o.id, []]));
  const seated = new Set<string>();
  for (const voter of voters) {
    for (const p of prefByVoter.get(voter)!) {
      const o = winnerById.get(p.optionId)!;
      const cap = o.maxPlayers ?? Infinity;
      if (seats.get(p.optionId)!.length < cap) {
        seats.get(p.optionId)!.push(voter);
        seated.add(voter);
        break;
      }
    }
  }

  const tables: GameTable[] = winners
    .filter((o) => seats.get(o.id)!.length > 0)
    .map((o) => ({
      bggId: o.bggId, gameName: o.gameName, gameThumbnail: o.gameThumbnail,
      minPlayers: o.minPlayers, maxPlayers: o.maxPlayers,
      players: seats.get(o.id)!,
      short: o.minPlayers != null && seats.get(o.id)!.length < o.minPlayers,
    }));

  const unseated = [...allVoters].filter((n) => !seated.has(n)).sort((a, b) => a.localeCompare(b));
  return { ranking, tables, unseated };
}
