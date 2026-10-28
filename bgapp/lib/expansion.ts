import { prisma } from "@/lib/prisma";

/** Il tipo di gioco che può avere un "Espansione per". */
export const EXPANSION_TYPE = "Espansione";

/**
 * Valore da scrivere in Game.expansionOfId partendo dal corpo della richiesta.
 *  - tipo inviato e diverso da "Espansione" → null: il collegamento non ha più
 *    senso, così cambiare tipo non lascia dati appesi;
 *  - campo presente → l'id scelto, oppure null se svuotato;
 *  - campo assente → undefined, cioè "non toccare": chi aggiorna altri campi
 *    non azzera il collegamento per sbaglio.
 */
export function expansionOfFromBody(body: Record<string, unknown>): number | null | undefined {
  if (typeof body.type === "string" && body.type !== EXPANSION_TYPE) return null;
  if (!("expansionOfId" in body)) return undefined;
  const v = body.expansionOfId;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Il gioco base scelto è accettabile? Non il gioco stesso, ancora esistente, e
 * non a sua volta un'espansione: l'albero resta a un livello, il che rende
 * impossibili anche i cicli. Ritorna il messaggio d'errore, o null se va bene.
 */
export async function checkExpansionOf(baseId: number, selfId?: number): Promise<string | null> {
  if (selfId != null && baseId === selfId) return "Un gioco non può essere espansione di sé stesso.";
  const base = await prisma.game.findUnique({ where: { id: baseId }, select: { type: true } });
  if (!base) return "Il gioco base scelto non esiste più.";
  if (base.type === EXPANSION_TYPE) return "Il gioco base non può essere a sua volta un'espansione.";
  return null;
}
