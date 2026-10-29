/**
 * I giocatori di una partita, come stanno in Play.players: un JSON in forma BGG
 * ([{ name, username, score, win, color, team }]). Prima ogni pagina lo leggeva
 * per conto suo; ora passa tutto da qui, così un cambio di formato si fa una volta.
 *
 * Non scarta e non riscrive nulla: il modulo di modifica rimanda a BGG quello
 * che ha letto. Normalizza solo ciò che serve a confrontare: `name` sempre
 * stringa, `win` sempre booleano (BGG e i vecchi import lo hanno scritto anche
 * come "1"/"true"). Modulo puro, usabile da server e browser.
 */
export interface StoredPlayer {
  name: string;
  username?: string | null;
  score: string;
  win: boolean;
  color?: string;
  team?: string;
}

/** JSON rotto, vuoto o non-array = nessun giocatore. */
export function parsePlayers(raw: string | null | undefined): StoredPlayer[] {
  if (!raw) return [];
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
    .map((x) => ({
      ...x,
      name: typeof x.name === "string" ? x.name : "",
      score: x.score == null ? "" : String(x.score),
      win: x.win === true || x.win === "true" || x.win === "1" || x.win === 1,
    }) as StoredPlayer);
}
