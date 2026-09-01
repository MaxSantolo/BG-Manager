/**
 * Single source of truth for game statuses and their BGG-flag mapping.
 *
 * The five built-in status KEYS are the app's semantic backbone — the dashboard,
 * statistics, "cosa giochiamo", and sync pruning all reason about them by key,
 * so keys are stable and built-ins can't be deleted. What IS configurable
 * (persisted in Settings.statusConfig): each status's label, colour, BGG-flag
 * mapping, and form visibility — plus brand-new custom statuses.
 */

/** BGG collection flags we can map to/from. */
export type BggFlag = "own" | "prevowned" | "fortrade" | "preordered" | "wishlist";

export interface StatusDef {
  key: string;
  label: string;
  color: string;          // Tailwind badge classes
  bgg: BggFlag[];         // BGG flags this status maps to (export) / matches (import)
  builtin?: boolean;      // true for the semantic backbone — cannot be deleted
  hidden?: boolean;       // hide from the game form's status picker
}

/**
 * Import priority is array order: the first status whose flags ALL appear on a
 * BGG item wins. So more-specific combos (own+fortrade) must precede their
 * subsets (own). Built-ins are ordered accordingly.
 */
export const DEFAULT_STATUSES: StatusDef[] = [
  { key: "InVendita",     label: "In Vendita",       color: "bg-amber-900 text-amber-200",   bgg: ["own", "fortrade"], builtin: true },
  { key: "InCollezione",  label: "In Collezione",    color: "bg-blue-900 text-blue-200",     bgg: ["own"],             builtin: true },
  { key: "Preordinato",   label: "Preordinato",      color: "bg-purple-900 text-purple-200", bgg: ["preordered"],      builtin: true },
  { key: "Venduto",       label: "Venduto",          color: "bg-red-900 text-red-200",       bgg: ["prevowned"],       builtin: true },
  { key: "GiocatoEsterno",label: "Giocato (ospite)", color: "bg-zinc-800 text-zinc-400",     bgg: [],                  builtin: true, hidden: true },
];

const VALID_FLAGS: BggFlag[] = ["own", "prevowned", "fortrade", "preordered", "wishlist"];

/** Parse the stored JSON, healing anything malformed back to a safe shape. */
export function parseStatusConfig(raw: string | null | undefined): StatusDef[] {
  if (!raw) return DEFAULT_STATUSES;
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return DEFAULT_STATUSES;
  }
  if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_STATUSES;

  const cleaned: StatusDef[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key.trim() : "";
    if (!key) continue;
    const label = typeof o.label === "string" && o.label.trim() ? o.label.trim() : key;
    const color = typeof o.color === "string" && o.color.trim() ? o.color.trim() : "bg-gray-800 text-gray-300";
    const bgg = Array.isArray(o.bgg) ? o.bgg.filter((f): f is BggFlag => VALID_FLAGS.includes(f as BggFlag)) : [];
    cleaned.push({ key, label, color, bgg, builtin: !!o.builtin, hidden: !!o.hidden });
  }
  if (cleaned.length === 0) return DEFAULT_STATUSES;

  // Guarantee every built-in still exists (keys the app depends on), appending
  // any that a bad save dropped — so the backbone can never go missing.
  for (const def of DEFAULT_STATUSES) {
    if (!cleaned.some(s => s.key === def.key)) cleaned.push(def);
  }
  return cleaned;
}

/** BGG status attributes string → app status key, honouring import priority. */
export function classifyFlags(config: StatusDef[], statusAttrs: string): string | null {
  const has = (flag: string) => new RegExp(`\\b${flag}="1"`).test(statusAttrs);
  // Match the most specific status first (more flags = more specific), so
  // own+fortrade wins over own regardless of the array's order — a healed
  // built-in appended at the end (parseStatusConfig) can't invert the priority.
  // Ties keep the configured order (stable sort).
  const candidates = [...config]
    .filter(s => s.bgg.length > 0)                 // e.g. GiocatoEsterno never matches import
    .sort((a, b) => b.bgg.length - a.bgg.length);
  for (const s of candidates) {
    if (s.bgg.every(has)) return s.key;
  }
  return null;
}

/** Extract the BGG wishlist priority (1..5) if present, else 3. */
export function wishlistPriority(statusAttrs: string): number {
  const raw = parseInt(statusAttrs.match(/\bwishlistpriority="(\d)"/)?.[1] ?? "3");
  return Number.isFinite(raw) && raw >= 1 && raw <= 5 ? raw : 3;
}

/** Whether a status key maps to the BGG wishlist. */
export function isWishlistStatus(config: StatusDef[], key: string): boolean {
  return config.find(s => s.key === key)?.bgg.includes("wishlist") ?? false;
}

/** App status key → the BGG flags object to write, or null if it has no mapping. */
export function flagsForStatus(config: StatusDef[], key: string): Record<string, boolean> | null {
  const def = config.find(s => s.key === key);
  if (!def || def.bgg.length === 0) return null;
  return Object.fromEntries(def.bgg.map(f => [f, true]));
}

export function labelFor(config: StatusDef[], key: string): string {
  return config.find(s => s.key === key)?.label ?? key;
}

export function colorFor(config: StatusDef[], key: string): string {
  return config.find(s => s.key === key)?.color ?? "bg-gray-800 text-gray-300";
}
