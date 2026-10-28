"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, PackageCheck, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useToast } from "@/components/Toast";
import DateInput from "@/components/DateInput";
import { dayInput, formatDayNum } from "@/lib/dates";

interface Pre {
  id: number; name: string; thumbnail: string | null; cost: number | null;
  preorderSourceId: number | null; preorderPaid: boolean; preorderEta: string | null;
}
interface Source { id: number; name: string }

const eur = (n: number) => `€${n.toFixed(2)}`;

/** Prima i preordini con una consegna prevista (la più vicina in alto), poi gli altri. */
function byEta(a: { eta: string | null; name: string }, b: { eta: string | null; name: string }) {
  if (a.eta && b.eta) return a.eta.localeCompare(b.eta) || a.name.localeCompare(b.name);
  if (a.eta) return -1;
  if (b.eta) return 1;
  return a.name.localeCompare(b.name);
}

export default function PreordersList({ initialGames, initialSources }: { initialGames: Pre[]; initialSources: Source[] }) {
  const { show } = useToast();
  const [games, setGames] = useState(initialGames);
  const [sources, setSources] = useState(initialSources);

  /** Modifica sul posto: si aggiorna subito, si torna indietro se il server dice no. */
  async function patch(g: Pre, data: Partial<Pre>) {
    const before = g;
    setGames((prev) => prev.map((x) => (x.id === g.id ? { ...x, ...data } : x)));
    const res = await apiFetch(`/api/games/${g.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) {
      setGames((prev) => prev.map((x) => (x.id === g.id ? before : x)));
      show(res.networkError ? "Connessione assente. Riprova." : "Modifica non salvata.", "error");
    }
  }

  // Consegna prevista: il campo data emette un valore a ogni tasto (mentre scrivi
  // l'anno passa per 0002, 0020, 0202…). Salvare ogni volta lasciava anni a metà
  // e mandava richieste che potevano arrivare fuori ordine. Quindi: la vista si
  // aggiorna subito, il salvataggio parte dopo una pausa e solo per un anno
  // plausibile; se fallisce si torna all'ultimo valore salvato.
  const etaTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  // Date confermate dal server: servono per tornare indietro se il salvataggio
  // fallisce, e per ordinare l'elenco senza far saltare la riga mentre si scrive.
  const savedEtaRef = useRef(new Map(initialGames.map((g) => [g.id, g.preorderEta])));
  const [savedEta, setSavedEta] = useState(() => new Map(savedEtaRef.current));
  useEffect(() => { const timers = etaTimers.current; return () => timers.forEach(clearTimeout); }, []);

  function changeEta(g: Pre, v: string) {
    setGames((prev) => prev.map((x) => (x.id === g.id ? { ...x, preorderEta: v || null } : x)));
    const pending = etaTimers.current.get(g.id);
    if (pending) clearTimeout(pending);
    const year = v ? Number(v.slice(0, 4)) : 0;
    if (v && (year < 2000 || year > 2100)) return; // anno incompleto: si aspetta
    etaTimers.current.set(g.id, setTimeout(async () => {
      etaTimers.current.delete(g.id);
      const res = await apiFetch(`/api/games/${g.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preorderEta: v || null }),
      });
      if (res.ok) {
        savedEtaRef.current.set(g.id, v || null);
        setSavedEta(new Map(savedEtaRef.current));
        return;
      }
      const back = savedEtaRef.current.get(g.id) ?? null;
      setGames((prev) => prev.map((x) => (x.id === g.id ? { ...x, preorderEta: back } : x)));
      show(res.networkError ? "Connessione assente. Riprova." : "Data di consegna non salvata.", "error");
    }, 700));
  }

  async function arrived(g: Pre) {
    const res = await apiFetch<{ name: string; purchaseDateSet: boolean; bgg?: { error?: string; pending?: boolean } }>(
      `/api/games/${g.id}/arrived`, { method: "POST" });
    if (!res.ok) {
      show(res.networkError ? "Connessione assente. Riprova." : "Non è stato possibile segnarlo come arrivato.", "error");
      return;
    }
    setGames((prev) => prev.filter((x) => x.id !== g.id));
    const bgg = res.data?.bgg;
    if (bgg?.error) show(`"${g.name}" è in Collezione, ma BGG non è aggiornato: ${bgg.error}`, "error");
    else show(`"${g.name}" è arrivato: ora è in Collezione${bgg?.pending ? " (aggiornamento BGG in corso)" : ""}.`);
  }

  if (games.length === 0) {
    return <div className="card text-center" style={{ color: "var(--text-secondary)" }}>Nessun preordine in attesa.</div>;
  }

  const total  = games.reduce((s, g) => s + (g.cost ?? 0), 0);
  const unpaid = games.filter((g) => !g.preorderPaid);
  const toPay  = unpaid.reduce((s, g) => s + (g.cost ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Preordini" value={String(games.length)} />
        <Stat label="Valore" value={eur(total)} />
        <Stat label="Pagati" value={`${games.length - unpaid.length} / ${games.length}`} />
        <Stat label="Ancora da pagare" value={eur(toPay)} color={toPay > 0 ? "var(--accent-red-light)" : undefined} />
      </div>

      <div className="flex flex-col gap-2">
        {[...games]
          .sort((a, b) => byEta({ eta: savedEta.get(a.id) ?? null, name: a.name }, { eta: savedEta.get(b.id) ?? null, name: b.name }))
          .map((g) => (
          <div key={g.id} className="card p-3 space-y-3">
            <div className="flex items-center gap-3">
              {g.thumbnail
                ? <img src={g.thumbnail} alt="" className="w-12 h-12 object-contain rounded flex-shrink-0" />
                : <div className="w-12 h-12 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />}
              <div className="flex-1 min-w-0">
                <Link href={`/collection/${g.id}?from=${encodeURIComponent("/preordini")}`}
                  className="font-semibold truncate block" style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                  {g.name}
                </Link>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {g.cost != null ? eur(g.cost) : "prezzo non indicato"}
                  {g.preorderEta && ` · arrivo previsto ${formatDayNum(g.preorderEta)}`}
                </p>
              </div>
              <ArrivedButton onConfirm={() => arrived(g)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div>
                <p className="field-label" style={{ color: "var(--text-secondary)" }}>Da dove viene</p>
                <SourceSelect
                  value={g.preorderSourceId}
                  sources={sources}
                  onChange={(id) => patch(g, { preorderSourceId: id })}
                  onCreated={(s) => setSources((prev) => (prev.some((x) => x.id === s.id) ? prev
                    : [...prev, s].sort((a, b) => a.name.localeCompare(b.name))))}
                />
              </div>
              <div>
                <p className="field-label" style={{ color: "var(--text-secondary)" }}>Consegna prevista</p>
                <DateInput value={dayInput(g.preorderEta)} className="w-full text-sm"
                  onChange={(v) => changeEta(g, v)} />
              </div>
              <div>
                <p className="field-label" style={{ color: "var(--text-secondary)" }}>Pagamento</p>
                <button type="button" onClick={() => patch(g, { preorderPaid: !g.preorderPaid })}
                  aria-pressed={g.preorderPaid}
                  className="w-full flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: g.preorderPaid ? "rgba(74, 222, 128, 0.12)" : "transparent",
                    color: g.preorderPaid ? "#4ade80" : "var(--text-secondary)",
                  }}>
                  {g.preorderPaid ? <><Check size={14} /> Pagato</> : "Da pagare"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Arrivato" in due tocchi: il primo chiede conferma nel bottone stesso. */
function ArrivedButton({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function click() {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); setArmed(false); }
  }

  return (
    <button type="button" onClick={click} disabled={busy}
      className={armed ? "btn-primary text-sm flex-shrink-0" : "btn-secondary text-sm flex-shrink-0"}
      title="Segna come arrivato: passa in Collezione">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
      <span>{armed ? "Confermi?" : "Arrivato"}</span>
    </button>
  );
}

/** Provenienza: scegli dal registro o aggiungi una voce sul posto. */
function SourceSelect({ value, sources, onChange, onCreated }: {
  value: number | null; sources: Source[];
  onChange: (id: number | null) => void; onCreated: (s: Source) => void;
}) {
  const { show } = useToast();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const res = await apiFetch<Source & { error?: string }>("/api/preorder-sources", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }),
      });
      if (!res.ok || !res.data?.id) { show(res.data?.error ?? "Provenienza non creata.", "error"); return; }
      onCreated({ id: res.data.id, name: res.data.name });
      onChange(res.data.id);
      setName(""); setCreating(false);
    } finally {
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <div className="flex items-center gap-1.5">
        <input type="text" value={name} autoFocus onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create(); } }}
          placeholder="es. Kickstarter" className="w-full text-sm" />
        <button type="button" onClick={create} disabled={busy || !name.trim()} className="btn-primary text-sm px-3">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Crea"}
        </button>
        <button type="button" onClick={() => { setCreating(false); setName(""); }} className="btn-ghost p-1.5" aria-label="Annulla">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full text-sm">
        <option value="">— non indicata —</option>
        {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="button" onClick={() => setCreating(true)} className="btn-ghost text-xs whitespace-nowrap"
        style={{ color: "var(--accent-blue-light)" }}>
        <Plus size={13} /> Nuova
      </button>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-3">
      <p className="eyebrow mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-lg font-bold tabular-nums" style={{ color: color ?? "var(--text-primary)" }}>{value}</p>
    </div>
  );
}
