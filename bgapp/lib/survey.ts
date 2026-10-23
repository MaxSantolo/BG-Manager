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
}

interface VoteRow { optionId: number; voterId: number; voterName: string }
interface OptionRow {
  id: number; bggId: number; gameName: string; gameThumbnail: string | null;
  minPlayers: number | null; maxPlayers: number | null;
  proposedById: number; proposedByName: string;
}

/** Conteggio voti per opzione + chi ha votato cosa, ordinato per voti. */
export function buildResults(options: OptionRow[], votes: VoteRow[]): OptionResult[] {
  const byOption = new Map<number, { n: number; names: string[] }>();
  for (const o of options) byOption.set(o.id, { n: 0, names: [] });
  for (const v of votes) {
    const slot = byOption.get(v.optionId);
    if (slot) { slot.n++; slot.names.push(v.voterName); }
  }
  return options
    .map((o) => ({
      ...o,
      votes: byOption.get(o.id)!.n,
      voterNames: byOption.get(o.id)!.names,
    }))
    .sort((a, b) => b.votes - a.votes || a.gameName.localeCompare(b.gameName));
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

export interface GameTable {
  bggId: number;
  gameName: string;
  gameThumbnail: string | null;
  players: string[];
}
export interface TablePlan {
  tables: GameTable[];
  unseated: string[];   // ha votato ma non è entrato in nessun tavolo
}

/**
 * Proposta — non verità — di come dividere i presenti in tavoli, partendo da
 * chi ha votato cosa. È un'euristica, pensata per essere corretta a mano.
 *
 * Obiettivo: far sedere più persone possibile a un gioco che hanno votato,
 * formando tavoli validi (numero giocatori entro il min/max di BGG, quando
 * noto). Una persona siede a un solo tavolo.
 *
 * Greedy, ripetuto: si prende ogni volta il gioco con più votanti ancora
 * liberi e lo si "apre" se raggiunge il minimo; si siedono prima i votanti meno
 * flessibili (chi ha votato meno giochi), così chi ha alternative resta per
 * riempire gli altri tavoli. Un gioco molto gettonato può aprire più tavoli.
 */
export function proposeTables(results: OptionResult[]): TablePlan {
  // Voti ancora "liberi": nome votante → insieme di opzioni votate.
  const pool = new Set<string>();
  const votedOptions = new Map<string, Set<number>>(); // nome → id opzioni
  for (const o of results) {
    for (const name of o.voterNames) {
      pool.add(name);
      if (!votedOptions.has(name)) votedOptions.set(name, new Set());
      votedOptions.get(name)!.add(o.id);
    }
  }

  const byId = new Map(results.map((o) => [o.id, o]));
  const tables: GameTable[] = [];

  // Un tavolo di una persona non è un tavolo: in assenza di min noto, soglia 2.
  const effMin = (o: OptionResult) => Math.max(o.minPlayers ?? 2, 1);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Per ogni opzione, i suoi votanti ancora liberi.
    let best: { opt: OptionResult; avail: string[] } | null = null;
    for (const o of results) {
      const avail = o.voterNames.filter((n) => pool.has(n));
      if (avail.length < effMin(o)) continue;
      if (!best
        || avail.length > best.avail.length
        || (avail.length === best.avail.length && o.votes > best.opt.votes)) {
        best = { opt: o, avail };
      }
    }
    if (!best) break;

    // Siedono prima i meno flessibili (meno opzioni ancora aperte votate).
    const stillOpen = (name: string) =>
      [...(votedOptions.get(name) ?? [])].filter((id) => {
        const o = byId.get(id)!;
        return o.voterNames.filter((n) => pool.has(n)).length >= effMin(o);
      }).length;
    const ordered = [...best.avail].sort((a, b) => stillOpen(a) - stillOpen(b) || a.localeCompare(b));

    const cap = best.opt.maxPlayers ?? ordered.length;
    const seated = ordered.slice(0, cap);
    for (const n of seated) pool.delete(n);

    tables.push({
      bggId: best.opt.bggId,
      gameName: best.opt.gameName,
      gameThumbnail: best.opt.gameThumbnail,
      players: seated,
    });
  }

  return { tables, unseated: [...pool].sort((a, b) => a.localeCompare(b)) };
}
