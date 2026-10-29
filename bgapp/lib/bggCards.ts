/**
 * Le carte di un gioco dalla sezione Sleeves di BGG. Non sono nell'API XML
 * ufficiale: le espone solo l'API interna del sito (api.geekdo.com), pubblica e
 * senza login ma non documentata, quindi può cambiare. Per questo si legge solo
 * a richiesta, da un tasto nella scheda del gioco, mai durante la sync.
 *
 * Due passi: gioco → card set (di solito uno; se sono più, si usa il primo),
 * card set → tipi di carta (misure in mm, quantità, nome).
 */
import type { CardSet } from "@/lib/cardSizes";

const API = "https://api.geekdo.com/api/geekitem/linkeditems";
const MAX_SETS = 8;

async function linked(query: string): Promise<Record<string, string>[]> {
  const res = await fetch(`${API}?ajax=1&nosession=1&pageid=1&${query}`, {
    headers: { "User-Agent": "BGManager (uso personale)" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BGG ha risposto ${res.status}`);
  const data = (await res.json().catch(() => null)) as { items?: Record<string, string>[] } | null;
  if (!data || !Array.isArray(data.items)) throw new Error("Risposta di BGG non riconosciuta");
  return data.items;
}

export async function fetchCardSets(bggId: number): Promise<CardSet[]> {
  const sets = (await linked(`linkdata_index=cardset&objectid=${bggId}&objecttype=thing&subtype=boardgame&showcount=${MAX_SETS}`))
    .filter((s) => s.itemstate === "approved");
  const out: CardSet[] = [];
  for (const s of sets.slice(0, MAX_SETS)) {
    const types = await linked(`linkdata_index=cardtype&objectid=${s.objectid}&objecttype=family&subtype=cardset&showcount=50`);
    out.push({
      id: Number(s.objectid),
      name: s.name || null,
      addon: s.addon === "1",
      types: types
        .filter((t) => t.itemstate === "approved")
        .map((t) => ({ w: Number(t.width), h: Number(t.height), qty: Number(t.quantity) || 0, name: t.name ?? "" }))
        .filter((t) => t.w > 0 && t.h > 0 && t.qty > 0),
    });
  }
  return out;
}
