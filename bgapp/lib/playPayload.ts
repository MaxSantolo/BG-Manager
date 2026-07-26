import type { BggPlayPlayer } from "@/lib/bggWrite";

/** BGG wants a bare calendar day; the form may hand us an ISO timestamp. */
export function toBggDate(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

interface FormPlayer {
  name?: string;
  username?: string | null;
  score?: string | null;
  win?: boolean;
  color?: string | null;
  new?: boolean;
}

/**
 * Players as stored locally → the shape geekplay.php expects. Anonymous
 * players simply carry no username, which BGG accepts as a plain name.
 */
export function toBggPlayers(players: unknown): BggPlayPlayer[] {
  if (!Array.isArray(players)) return [];
  return (players as FormPlayer[])
    .filter(p => p?.name?.trim())
    .map(p => ({
      name:     p.name!.trim(),
      username: p.username?.trim() || null,
      score:    p.score ?? "",
      win:      !!p.win,
      color:    p.color ?? "",
      new:      !!p.new,
    }));
}
