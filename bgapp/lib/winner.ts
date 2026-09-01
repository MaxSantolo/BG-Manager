/**
 * How a game decides the winner of a play. Lives per game on Game.winMode.
 *   high   — most points wins (default)
 *   low    — fewest points wins (golf-likes, penalty scores)
 *   coop   — cooperative: everyone wins or loses together (no per-player score)
 *   manual — tick the winners by hand (no score, teams, anything unusual)
 */
export type WinMode = "high" | "low" | "coop" | "manual";

export const WIN_MODES: { value: WinMode; label: string }[] = [
  { value: "high",   label: "Punteggio più alto vince" },
  { value: "low",    label: "Punteggio più basso vince" },
  { value: "coop",   label: "Cooperativo (vittoria/sconfitta comune)" },
  { value: "manual", label: "Manuale (spunta i vincitori)" },
];

/** Coerce a stored value to a valid WinMode, defaulting to "high". */
export function asWinMode(v: string | null | undefined): WinMode {
  return v === "low" || v === "coop" || v === "manual" ? v : "high";
}

/** A score string → number, or null when blank / non-numeric (accepts comma). */
export function parseScore(s: string | null | undefined): number | null {
  if (s == null) return null;
  const t = String(s).trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Selectable team labels (empty = no team / free-for-all). */
export const TEAMS = ["A", "B", "C", "D", "E", "F"] as const;

type ScoredPlayer = { score: string; team?: string | null };

/**
 * For high/low, the win flags aligned to `players`, derived from the numeric
 * scores. Everyone tied at the best score wins; blank/non-numeric scores can't.
 *
 * If any player has a team, it switches to TEAM scoring: each team's total is
 * the sum of its members' numeric scores, the best-total team(s) win, and all
 * their members get the flag. Players with no team each count as their own
 * one-person team, so team/solo can be mixed.
 *
 * Returns null when the mode isn't score-based (coop/manual) or nothing numeric
 * decides it yet — the caller then leaves the existing flags untouched.
 */
export function autoWinFlags(players: ScoredPlayer[], mode: WinMode): boolean[] | null {
  if (mode !== "high" && mode !== "low") return null;

  const teamed = players.some(p => (p.team ?? "").trim() !== "");
  if (!teamed) {
    const scores = players.map(p => parseScore(p.score));
    const nums = scores.filter((n): n is number => n !== null);
    if (nums.length === 0) return null;
    const best = mode === "high" ? Math.max(...nums) : Math.min(...nums);
    return scores.map(n => n !== null && n === best);
  }

  // Team scoring: group key = team label, or a unique per-row key for the
  // unteamed so they stay individual.
  const keyOf = (p: ScoredPlayer, i: number) => (p.team ?? "").trim() || `__solo_${i}`;
  const sums = new Map<string, number>();
  players.forEach((p, i) => {
    const s = parseScore(p.score);
    if (s !== null) { const k = keyOf(p, i); sums.set(k, (sums.get(k) ?? 0) + s); }
  });
  if (sums.size === 0) return null;
  const totals = [...sums.values()];
  const best = mode === "high" ? Math.max(...totals) : Math.min(...totals);
  return players.map((p, i) => { const t = sums.get(keyOf(p, i)); return t !== undefined && t === best; });
}
