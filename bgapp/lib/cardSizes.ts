/**
 * Carte (da BGG) e formati di bustine del magazzino. Modulo puro, usato dal
 * server e dalla scheda del gioco.
 *
 * BGG dà le misure misurate della carta (64x89, 44.9x67.9), il magazzino ha
 * formati nominali (63x88, 45x68): si abbina il formato più vicino entro 2 mm
 * per lato, a prescindere dall'orientamento. È un suggerimento: nella scheda si
 * può cambiare o escludere.
 */
export interface CardType { w: number; h: number; qty: number; name: string }
/** Un card set del gioco su BGG. Se ce n'è più d'uno si usa il primo (scelta di Max), cambiabile dalla scheda. */
export interface CardSet { id: number; name: string | null; addon: boolean; types: CardType[] }
export interface SleeveFormat { id: number; size: string; label: string | null; quantity: number }

const TOLERANCE_MM = 2;

/** "63.5x88" / "63,5 x 88" → [63.5, 88], lato corto per primo. */
export function parseSize(size: string): [number, number] | null {
  const m = size.replace(/,/g, ".").match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  return a <= b ? [a, b] : [b, a];
}

export const sizeLabel = (w: number, h: number) => {
  const [a, b] = w <= h ? [w, h] : [h, w];
  return `${a}×${b}`;
};

/**
 * Il formato per la carta: tra quelli che il gioco usa già (preferred) se uno è
 * entro la tolleranza, altrimenti il più vicino del magazzino; null se nessuno.
 * La preferenza conta: Western Legends ha le carte 64x89 in bustine 66x91, che
 * sarebbe solo il secondo più vicino dopo 63x88.
 */
export function matchFormat(w: number, h: number, formats: SleeveFormat[], preferred: number[] = []): SleeveFormat | null {
  if (preferred.length) {
    const own = nearestFormat(w, h, formats.filter((f) => preferred.includes(f.id)));
    if (own) return own;
  }
  return nearestFormat(w, h, formats);
}

function nearestFormat(w: number, h: number, formats: SleeveFormat[]): SleeveFormat | null {
  const [a, b] = w <= h ? [w, h] : [h, w];
  let best: SleeveFormat | null = null, bestD = Infinity;
  for (const f of formats) {
    const s = parseSize(f.size);
    if (!s) continue;
    const da = Math.abs(s[0] - a), db = Math.abs(s[1] - b);
    if (da > TOLERANCE_MM || db > TOLERANCE_MM) continue;
    const d = da * da + db * db;
    if (d < bestD) { best = f; bestD = d; }
  }
  return best;
}

export function parseCardSets(raw: string | null | undefined): CardSet[] | null {
  if (raw == null) return null;
  try {
    const v = JSON.parse(raw) as { sets?: CardSet[] };
    return Array.isArray(v?.sets) ? v.sets : [];
  } catch {
    return [];
  }
}

/** Il card set in uso: quello scelto, o il primo. */
export function chosenSet(sets: CardSet[] | null, chosenId: number | null): CardSet | null {
  if (!sets || sets.length === 0) return null;
  return sets.find((s) => s.id === chosenId) ?? sets[0];
}

/**
 * Le carte del card set raggruppate per formato del magazzino: quante bustine
 * servono di ciascuno, più le misure che non hanno un formato.
 */
export function needsByFormat(set: CardSet | null, formats: SleeveFormat[], preferred: number[] = []) {
  const matched = new Map<number, { format: SleeveFormat; qty: number; names: string[] }>();
  const unmatched = new Map<string, { size: string; qty: number; names: string[] }>();
  for (const s of set ? [set] : []) {
    for (const t of s.types) {
      const f = matchFormat(t.w, t.h, formats, preferred);
      if (f) {
        const e = matched.get(f.id) ?? { format: f, qty: 0, names: [] };
        e.qty += t.qty; e.names.push(t.name);
        matched.set(f.id, e);
      } else {
        const k = sizeLabel(t.w, t.h);
        const e = unmatched.get(k) ?? { size: k, qty: 0, names: [] };
        e.qty += t.qty; e.names.push(t.name);
        unmatched.set(k, e);
      }
    }
  }
  return { matched: [...matched.values()], unmatched: [...unmatched.values()] };
}

export interface NeedRow {
  format: SleeveFormat;
  cards: number;       // carte dei giochi che usano questo formato
  sleeved: number;     // di queste, già imbustate (bustine assegnate al gioco, fino al numero di carte)
  todo: number;        // ancora da imbustare
  buy: number;         // da comprare: da imbustare meno scorta
  games: string[];     // giochi con carte ancora da imbustare
}

/**
 * Lista della spesa: per formato, carte da imbustare nei giochi di cui si sono
 * caricate le carte, contro la scorta. Gioco per gioco: le bustine assegnate a
 * un gioco coprono solo le carte di quel gioco.
 */
export function shoppingList(
  games: { name: string; sets: CardSet[] | null; setId: number | null; assigned: { sleeveId: number; qty: number }[] }[],
  formats: SleeveFormat[],
) {
  const rows = new Map<number, NeedRow>();
  const unmatched = new Map<string, { size: string; cards: number; games: string[] }>();
  let loaded = 0, noCards = 0;
  for (const g of games) {
    if (g.sets === null) continue;
    loaded++;
    const set = chosenSet(g.sets, g.setId);
    if (!set || set.types.length === 0) { noCards++; continue; }
    const assignedBy = new Map<number, number>();
    for (const a of g.assigned) assignedBy.set(a.sleeveId, (assignedBy.get(a.sleeveId) ?? 0) + a.qty);
    const needs = needsByFormat(set, formats, [...assignedBy.keys()]);
    for (const m of needs.matched) {
      const r = rows.get(m.format.id) ?? { format: m.format, cards: 0, sleeved: 0, todo: 0, buy: 0, games: [] };
      const done = Math.min(m.qty, assignedBy.get(m.format.id) ?? 0);
      r.cards += m.qty; r.sleeved += done; r.todo += m.qty - done;
      if (m.qty > done) r.games.push(g.name);
      rows.set(m.format.id, r);
    }
    for (const u of needs.unmatched) {
      const e = unmatched.get(u.size) ?? { size: u.size, cards: 0, games: [] };
      e.cards += u.qty; e.games.push(g.name);
      unmatched.set(u.size, e);
    }
  }
  const list = [...rows.values()].map((r) => ({ ...r, buy: Math.max(0, r.todo - r.format.quantity) }))
    .sort((a, b) => b.buy - a.buy || b.todo - a.todo || a.format.size.localeCompare(b.format.size));
  return { rows: list, unmatched: [...unmatched.values()].sort((a, b) => b.cards - a.cards), loaded, noCards };
}
