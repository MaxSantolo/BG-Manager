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
  gameId: number;
  gameName: string;
  gameThumbnail: string | null;
  proposedById: number;
  proposedByName: string;
  votes: number;
  voterNames: string[];
}

interface VoteRow { optionId: number; voterId: number; voterName: string }
interface OptionRow {
  id: number; gameId: number; gameName: string; gameThumbnail: string | null;
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
