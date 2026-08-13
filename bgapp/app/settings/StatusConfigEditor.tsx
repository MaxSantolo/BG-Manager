"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Check, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import type { StatusDef, BggFlag } from "@/lib/status";

const COLORS: { label: string; value: string }[] = [
  { label: "Blu",    value: "bg-blue-900 text-blue-200" },
  { label: "Ambra",  value: "bg-amber-900 text-amber-200" },
  { label: "Rosso",  value: "bg-red-900 text-red-200" },
  { label: "Viola",  value: "bg-purple-900 text-purple-200" },
  { label: "Verde",  value: "bg-green-900 text-green-200" },
  { label: "Grigio", value: "bg-zinc-800 text-zinc-400" },
];

const FLAGS: { flag: BggFlag; label: string }[] = [
  { flag: "own",        label: "Posseduto (own)" },
  { flag: "fortrade",   label: "In vendita (fortrade)" },
  { flag: "preordered", label: "Preordine (preordered)" },
  { flag: "prevowned",  label: "Posseduto in passato (prevowned)" },
  { flag: "wishlist",   label: "Desiderata (wishlist)" },
];

function slug(s: string): string {
  return s.trim().replace(/[^a-zA-Z0-9]+/g, "") || "Stato";
}

export default function StatusConfigEditor() {
  const [rows, setRows]   = useState<StatusDef[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ statusConfig: StatusDef[] }>("/api/settings")
      .then(r => setRows(r.data?.statusConfig ?? []))
      .catch(() => setRows([]));
  }, []);

  function patch(i: number, p: Partial<StatusDef>) {
    setRows(rs => rs!.map((r, idx) => idx === i ? { ...r, ...p } : r));
  }
  function toggleFlag(i: number, flag: BggFlag) {
    setRows(rs => rs!.map((r, idx) => {
      if (idx !== i) return r;
      const has = r.bgg.includes(flag);
      return { ...r, bgg: has ? r.bgg.filter(f => f !== flag) : [...r.bgg, flag] };
    }));
  }
  function move(i: number, dir: -1 | 1) {
    setRows(rs => {
      const a = [...rs!]; const j = i + dir;
      if (j < 0 || j >= a.length) return a;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  }
  function remove(i: number) {
    setRows(rs => rs!.filter((_, idx) => idx !== i));
  }
  function add() {
    setRows(rs => {
      const keys = new Set(rs!.map(r => r.key));
      let key = "Nuovo"; let n = 1;
      while (keys.has(key)) key = `Nuovo${++n}`;
      return [...rs!, { key, label: "Nuovo stato", color: COLORS[5].value, bgg: [], builtin: false }];
    });
  }

  async function save() {
    if (!rows) return;
    // Fill keys for any new rows from their label; keep built-in keys untouched.
    const prepared = rows.map(r => ({
      ...r,
      key: r.builtin ? r.key : (r.key && r.key !== "Nuovo" ? r.key : slug(r.label)),
      label: r.label.trim() || r.key,
    }));
    setSaving(true); setSaved(false); setErr(null);
    const res = await apiFetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusConfig: prepared }),
    });
    setSaving(false);
    if (res.timedOut || res.networkError) { setErr("Connessione assente. Riprova."); return; }
    if (!res.ok) { setErr("Salvataggio fallito."); return; }
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  if (!rows) {
    return <div className="card flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
      <Loader2 size={15} className="animate-spin" /> Caricamento stati…
    </div>;
  }

  return (
    <div className="card space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Stati dei giochi</h2>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Etichetta, colore e corrispondenza BGG di ogni stato. L&apos;ordine definisce la priorità
          in importazione (vince il primo i cui flag sono tutti presenti). Gli stati di base non si
          eliminano ma si possono rinominare e rimappare.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-lg p-3 space-y-2"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className={`badge text-xs ${r.color}`}>{r.label || r.key}</span>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn-ghost p-1" title="Su">
                  <ChevronUp size={14} style={{ color: "var(--text-muted)" }} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="btn-ghost p-1" title="Giù">
                  <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                </button>
                {!r.builtin && (
                  <button type="button" onClick={() => remove(i)} className="btn-ghost p-1" title="Elimina">
                    <Trash2 size={14} style={{ color: "var(--accent-red-light)" }} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wide mb-0.5" style={{ color: "var(--text-secondary)" }}>Etichetta</span>
                <input type="text" value={r.label} onChange={e => patch(i, { label: e.target.value })} className="w-full text-sm" />
              </label>
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wide mb-0.5" style={{ color: "var(--text-secondary)" }}>Colore</span>
                <select value={r.color} onChange={e => patch(i, { color: e.target.value })} className="w-full text-sm">
                  {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  {!COLORS.some(c => c.value === r.color) && <option value={r.color}>Personalizzato</option>}
                </select>
              </label>
            </div>

            <div>
              <span className="block text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--text-secondary)" }}>
                Corrispondenza BGG
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {FLAGS.map(({ flag, label }) => (
                  <label key={flag} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                    <input type="checkbox" checked={r.bgg.includes(flag)} onChange={() => toggleFlag(i, flag)} />
                    {label}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer mt-1.5" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={!!r.hidden} onChange={e => patch(i, { hidden: e.target.checked })} />
                Nascondi dal modulo (non selezionabile per nuovi giochi)
              </label>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="btn-ghost text-sm flex items-center gap-1.5" style={{ color: "var(--accent-blue-light)" }}>
        <Plus size={14} /> Aggiungi stato
      </button>

      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio…</> : <><Check size={14} /> Salva stati</>}
        </button>
        {saved && <span className="text-sm flex items-center gap-1.5" style={{ color: "#4ade80" }}><Check size={14} /> Salvato</span>}
        {err && <span className="text-sm flex items-center gap-1.5" style={{ color: "var(--accent-red-light)" }}><AlertCircle size={14} /> {err}</span>}
      </div>
    </div>
  );
}
