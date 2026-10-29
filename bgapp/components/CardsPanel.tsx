"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, EyeOff, Layers, Loader2, PackageCheck, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useToast } from "@/components/Toast";
import { formatDayNum } from "@/lib/dates";
import { chosenSet, matchFormat, sizeLabel, type CardSet, type SleeveFormat } from "@/lib/cardSizes";

interface Row { key: string; include: boolean; sleeveId: number | null; qty: string; w: number; h: number; name: string }

function rowsFor(set: CardSet | null, formats: SleeveFormat[], own: number[]): Row[] {
  return (set?.types ?? []).map((t, i) => {
    const f = matchFormat(t.w, t.h, formats, own);
    return { key: `${set!.id}-${i}`, include: !!f, sleeveId: f?.id ?? null, qty: String(t.qty), w: t.w, h: t.h, name: t.name };
  });
}

/**
 * Carte del gioco dalla sezione Sleeves di BGG, caricate solo premendo il tasto
 * (l'API è interna a BGG: niente letture automatiche). Con più card set si usa
 * il primo; "Imbusta" assegna le bustine dal magazzino.
 */
export default function CardsPanel({ gameId, initialSets, initialSetId, initialCheckedAt, formats, assigned }: {
  gameId: number;
  initialSets: CardSet[] | null; initialSetId: number | null; initialCheckedAt: string | null;
  formats: SleeveFormat[];
  assigned: { sleeveId: number; qty: number }[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [sets, setSets] = useState(initialSets);
  const [setId, setSetId] = useState(initialSetId);
  const [checkedAt, setCheckedAt] = useState(initialCheckedAt);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const set = useMemo(() => chosenSet(sets, setId), [sets, setId]);
  const assignedBy = new Map(assigned.map((a) => [a.sleeveId, a.qty]));
  const own = [...assignedBy.keys()];
  const [rows, setRows] = useState<Row[]>(() => rowsFor(chosenSet(initialSets, initialSetId), formats, own));

  async function load() {
    setLoading(true);
    const res = await apiFetch<{ sets: CardSet[]; cardSetId: number | null; checkedAt: string; error?: string }>(
      `/api/games/${gameId}/cards`, { method: "POST" }, 60000);
    setLoading(false);
    if (!res.ok || !res.data?.sets) {
      show(res.networkError ? "Connessione assente. Riprova." : res.data?.error ?? "Caricamento da BGG non riuscito.", "error");
      return;
    }
    setSets(res.data.sets); setSetId(res.data.cardSetId); setCheckedAt(res.data.checkedAt);
    setRows(rowsFor(chosenSet(res.data.sets, res.data.cardSetId), formats, own));
    show(res.data.sets.length === 0 ? "BGG non ha carte per questo gioco." : "Carte caricate da BGG.", "success");
  }

  async function choose(id: number) {
    const prev = setId;
    setSetId(id); setRows(rowsFor(chosenSet(sets, id), formats, own));
    const res = await apiFetch(`/api/games/${gameId}/cards`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setId: id }),
    });
    if (!res.ok) { setSetId(prev); setRows(rowsFor(chosenSet(sets, prev), formats, own)); show("Scelta non salvata.", "error"); }
  }

  // "Ignora": via i dati caricati, se quel gioco non interessa. Si ricaricano col tasto.
  async function ignore() {
    setClearing(true);
    const res = await apiFetch(`/api/games/${gameId}/cards`, { method: "DELETE" });
    setClearing(false);
    if (!res.ok) { show(res.networkError ? "Connessione assente. Riprova." : "Dati non svuotati.", "error"); return; }
    setSets(null); setSetId(null); setCheckedAt(null); setRows([]);
    show("Carte svuotate.", "success");
  }

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  // Per formato: le righe incluse sommate. "Imbusta" sostituisce la quantità di quei formati sul gioco.
  const totals = new Map<number, number>();
  for (const r of rows) if (r.include && r.sleeveId && Number(r.qty) > 0) totals.set(r.sleeveId, (totals.get(r.sleeveId) ?? 0) + Number(r.qty));

  async function sleeve() {
    setSaving(true);
    const res = await apiFetch<{ error?: string; insufficient?: { size: string; label: string | null; requested: number; available: number }[] }>(
      `/api/games/${gameId}/cards/sleeve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: [...totals].map(([sleeveId, qty]) => ({ sleeveId, qty })) }),
      });
    setSaving(false);
    if (res.status === 409 && res.data?.insufficient) {
      show(`Magazzino insufficiente: ${res.data.insufficient.map((i) => `${i.label || i.size} servono ${i.requested}, disponibili ${i.available}`).join("; ")}. Rifornisci da Bustine.`, "error");
      return;
    }
    if (!res.ok) { show(res.networkError ? "Connessione assente. Riprova." : res.data?.error ?? "Bustine non assegnate.", "error"); return; }
    show("Bustine assegnate.", "success");
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers size={15} style={{ color: "var(--accent-blue-light)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Carte (da BGG)</h2>
          {checkedAt && <span className="text-xs" style={{ color: "var(--text-muted)" }}>controllato il {formatDayNum(checkedAt)}</span>}
        </div>
        <button type="button" onClick={load} disabled={loading} className="btn-secondary text-xs flex items-center gap-1.5">
          {loading ? <Loader2 size={13} className="animate-spin" /> : sets ? <RefreshCw size={13} /> : <Download size={13} />}
          {sets ? "Ricarica" : "Carica da BGG"}
        </button>
      </div>

      {sets === null && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Non ancora caricate. BGG le tiene nella sezione Sleeves del gioco: si leggono solo quando premi il tasto.
        </p>
      )}
      {sets !== null && sets.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Su BGG non ci sono carte: niente da imbustare.</p>
          <IgnoreButton busy={clearing} onClick={ignore} />
        </div>
      )}

      {sets && sets.length > 1 && (
        <label className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {sets.length} card set su BGG, in uso:
          <select value={set?.id ?? ""} onChange={(e) => choose(Number(e.target.value))} className="text-xs">
            {sets.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i + 1}. {s.name || "senza nome"}{s.addon ? " (add-on)" : ""} · {s.types.reduce((n, t) => n + t.qty, 0)} carte
              </option>
            ))}
          </select>
        </label>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm py-1.5 border-t first:border-t-0"
              style={{ borderColor: "var(--border)" }}>
              <label className="flex items-center gap-2 min-w-0 flex-1 basis-56">
                <input type="checkbox" checked={r.include} onChange={(e) => patch(r.key, { include: e.target.checked })} />
                <span className="min-w-0">
                  <span className="font-mono" style={{ color: "var(--text-primary)" }}>{sizeLabel(r.w, r.h)}</span>
                  <span className="block text-xs truncate" style={{ color: "var(--text-muted)" }} title={r.name}>{r.name || "carte"}</span>
                </span>
              </label>
              <select value={r.sleeveId ?? ""} onChange={(e) => patch(r.key, { sleeveId: e.target.value ? Number(e.target.value) : null, include: !!e.target.value })}
                className="text-xs w-40" aria-label={`Formato per ${sizeLabel(r.w, r.h)}`}>
                <option value="">— nessun formato —</option>
                {formats.map((f) => <option key={f.id} value={f.id}>{f.label || f.size} (scorta {f.quantity})</option>)}
              </select>
              <input type="number" min={1} value={r.qty} onChange={(e) => patch(r.key, { qty: e.target.value })}
                className="text-xs w-20 text-right" aria-label={`Quantità ${sizeLabel(r.w, r.h)}`} />
              {r.sleeveId && assignedBy.has(r.sleeveId) && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>già assegnate {assignedBy.get(r.sleeveId)}</span>
              )}
              {!r.sleeveId && (
                <span className="text-xs" style={{ color: "var(--accent-red-light)" }}>nessun formato vicino in magazzino</span>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Imbusta assegna i formati spuntati al gioco: per ognuno la quantità sostituisce quella che c&apos;era, e la scorta scala della differenza.
            </p>
            <div className="flex items-center gap-2">
              <IgnoreButton busy={clearing} onClick={ignore} />
              <button type="button" onClick={sleeve} disabled={saving || totals.size === 0} className="btn-primary text-sm flex items-center gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />} Imbusta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IgnoreButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="btn-ghost text-sm flex items-center gap-1.5"
      title="Svuota le carte caricate: non interessano">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />} Ignora
    </button>
  );
}
