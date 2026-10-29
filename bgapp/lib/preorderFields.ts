import { parseDayInput } from "@/lib/dates";

export interface PreorderData { preorderSourceId?: number | null; preorderPaid?: boolean; preorderEta?: Date | null }

/**
 * I campi del preordine da un corpo di richiesta: provenienza, pagato,
 * consegna prevista. Li mandano la pagina Preordini (PATCH) e il modulo del
 * gioco (PUT/POST), con le stesse regole: un campo assente non si tocca, null
 * o "" lo svuota, una data che non è un giorno vero è un errore.
 */
export function preorderFromBody(body: Record<string, unknown>): { data: PreorderData } | { error: string } {
  const data: PreorderData = {};
  if ("preorderSourceId" in body) {
    const v = body.preorderSourceId;
    const id = v == null || v === "" ? null : Number(v);
    if (id != null && !Number.isInteger(id)) return { error: "Provenienza non valida" };
    data.preorderSourceId = id;
  }
  if (typeof body.preorderPaid === "boolean") data.preorderPaid = body.preorderPaid;
  if ("preorderEta" in body) {
    // Giorno a mezzanotte UTC (lib/dates). Un anno a metà (0202 mentre si digita
    // 2026) o un giorno inesistente non sono date.
    const v = typeof body.preorderEta === "string" ? body.preorderEta.trim() : "";
    const d = v ? parseDayInput(v) : null;
    if (v && !d) return { error: "Data di consegna non valida" };
    data.preorderEta = d;
  }
  return { data };
}
