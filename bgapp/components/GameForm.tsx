"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Loader2, RefreshCw, ExternalLink, User, Calendar, AlertTriangle } from "lucide-react";
import BggSearch from "@/components/BggSearch";
import SleeveEditor from "@/components/SleeveEditor";
import { useToast } from "@/components/Toast";
import type { BggGameDetail } from "@/lib/bgg";
import {
  GAME_TYPES, GAME_STATUSES, INSERT_OPTIONS,
  STATUS_LABELS,
} from "@/lib/types";

type Mode = "collection" | "wishlist";

interface Props {
  mode: Mode;
  initialData?: Record<string, unknown>;
  id?: number;
  returnUrl?: string;
}

function toDateInput(val: unknown): string {
  if (!val) return "";
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

function parseDesigners(val: unknown): string[] {
  try { return JSON.parse(String(val ?? "[]")); } catch { return []; }
}

export default function GameForm({ mode, initialData, id, returnUrl }: Props) {
  const router = useRouter();
  const { show } = useToast();
  const isWishlist = mode === "wishlist";
  const backUrl = returnUrl ?? (isWishlist ? "/wishlist" : "/collection");
  const [saving, setSaving] = useState(false);

  // BGG data
  const [bggId, setBggId]           = useState<number | null>(initialData?.bggId ? Number(initialData.bggId) : null);
  const [thumbnail, setThumbnail]   = useState(String(initialData?.thumbnail ?? ""));
  const [image, setImage]           = useState(String(initialData?.image ?? ""));
  const [description, setDescription] = useState(String(initialData?.description ?? ""));
  const [designers, setDesigners]   = useState<string[]>(parseDesigners(initialData?.designers));
  const [mechanics, setMechanics]   = useState<string[]>(parseDesigners(initialData?.mechanics));
  const [bggRating, setBggRating]   = useState(String(initialData?.bggRating ?? ""));
  const [bggWeight, setBggWeight]   = useState(String(initialData?.bggWeight ?? ""));
  const [minPlayers, setMinPlayers] = useState(String(initialData?.minPlayers ?? ""));
  const [maxPlayers, setMaxPlayers] = useState(String(initialData?.maxPlayers ?? ""));
  const [playTime, setPlayTime]     = useState(String(initialData?.playTime ?? ""));
  const [yearPublished, setYearPublished] = useState(String(initialData?.yearPublished ?? ""));

  // Game fields
  const [name, setName]             = useState(String(initialData?.name ?? ""));
  const [type, setType]             = useState(String(initialData?.type ?? "Base"));
  const [status, setStatus]         = useState(String(initialData?.status ?? (isWishlist ? "" : "InCollezione")));
  const [cost, setCost]             = useState(String(initialData?.cost ?? ""));
  const [salePrice, setSalePrice]   = useState(String(initialData?.salePrice ?? ""));
  const [insert, setInsert]         = useState(String(initialData?.insert ?? "No"));
  const [purchaseDate, setPurchaseDate] = useState(toDateInput(initialData?.purchaseDate));
  const [saleDate, setSaleDate]         = useState(toDateInput(initialData?.saleDate));
  const [valueRange, setValueRange]     = useState(String(initialData?.valueRange ?? ""));
  const [desirability, setDesirability] = useState(String(initialData?.desirability ?? "3"));
  const [notes, setNotes]               = useState(String(initialData?.notes ?? ""));

  // Bustine normalizzate
  function extractSleevesFromInitial(data: any): { sleeveId: number; qty: number }[] {
    if (Array.isArray(data?.gameSleeves)) {
      return data.gameSleeves.map((gs: any) => ({ sleeveId: gs.sleeveId, qty: gs.qty }));
    }
    return [];
  }
  const [sleevesData, setSleevesData] = useState<{ sleeveId: number; qty: number }[]>(
    extractSleevesFromInitial(initialData ?? {})
  );

  // Whether we're in "bgg selected" mode
  const [bggSelected, setBggSelected] = useState(!!bggId);

  // Duplicate detection
  type Duplicate = { kind: "collection" | "wishlist"; id: number; name: string; status?: string };
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);

  useEffect(() => {
    if (!bggId) { setDuplicate(null); return; }
    let cancelled = false;
    (async () => {
      const [colRes, wishRes] = await Promise.all([
        fetch(`/api/games?bggId=${bggId}&limit=1`),
        fetch(`/api/wishlist?bggId=${bggId}`),
      ]);
      if (cancelled) return;
      if (colRes.ok) {
        const data = await colRes.json();
        const hit = (data.games ?? []).find((g: { id: number }) => g.id !== id);
        if (hit) { setDuplicate({ kind: "collection", id: hit.id, name: hit.name, status: hit.status }); return; }
      }
      if (wishRes.ok) {
        const list = await wishRes.json();
        const hit = (Array.isArray(list) ? list : []).find((g: { id: number }) => !(isWishlist && g.id === id));
        if (hit) { setDuplicate({ kind: "wishlist", id: hit.id, name: hit.name }); return; }
      }
      setDuplicate(null);
    })();
    return () => { cancelled = true; };
  }, [bggId, id, isWishlist]);

  function applyBggData(game: BggGameDetail) {
    setName(game.name);
    setBggId(game.id);
    setBggSelected(true);
    if (game.thumbnail)    setThumbnail(game.thumbnail);
    if (game.image)        setImage(game.image);
    if (game.description)  setDescription(game.description);
    if (game.designers?.length) setDesigners(game.designers);
    if (game.mechanics?.length) setMechanics(game.mechanics);
    if (game.bggRating)    setBggRating(game.bggRating.toFixed(2));
    if (game.bggWeight)    setBggWeight(game.bggWeight.toFixed(2));
    if (game.minPlayers)   setMinPlayers(String(game.minPlayers));
    if (game.maxPlayers)   setMaxPlayers(String(game.maxPlayers));
    if (game.playTime)     setPlayTime(String(game.playTime));
    if (game.yearPublished) setYearPublished(String(game.yearPublished));
  }

  function clearBgg() {
    setBggId(null);
    setBggSelected(false);
    setThumbnail("");
    setImage("");
    setDescription("");
    setDesigners([]);
    setMechanics([]);
    setBggRating("");
    setBggWeight("");
    setMinPlayers("");
    setMaxPlayers("");
    setPlayTime("");
    setYearPublished("");
  }

  async function refreshFromBgg() {
    if (!bggId) return;
    setSaving(true);
    const res = await fetch(`/api/bgg?id=${bggId}`);
    if (res.ok) applyBggData(await res.json());
    setSaving(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      bggId: bggId || null,
      name: name.trim(),
      type, insert,
      thumbnail: thumbnail || null,
      image: image || null,
      description: description || null,
      designers: JSON.stringify(designers),
      mechanics: JSON.stringify(mechanics),
      bggRating: bggRating || null,
      bggWeight: bggWeight || null,
      minPlayers: minPlayers || null,
      maxPlayers: maxPlayers || null,
      playTime: playTime || null,
      yearPublished: yearPublished || null,
      notes: notes || null,
    };

    if (isWishlist) {
      payload.valueRange   = valueRange || null;
      payload.desirability = desirability;
      payload.status       = status || null;
    } else {
      payload.status       = status;
      payload.cost         = cost || null;
      payload.salePrice    = salePrice || null;
      payload.purchaseDate = purchaseDate || null;
      payload.saleDate     = saleDate || null;
      payload.sleeves      = sleevesData;
    }

    const base   = isWishlist ? "/api/wishlist" : "/api/games";
    const url    = id ? `${base}/${id}` : base;
    const method = id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      if (res.status === 409) {
        const data = await res.json().catch(() => null);
        const items = (data?.insufficient ?? []) as { size: string; label: string | null; requested: number; available: number }[];
        const detail = items.map(i => `${i.label || i.size}: servono ${i.requested}, disponibili ${i.available}`).join("; ");
        show(`Magazzino bustine insufficiente. ${detail}. Rifornisci dalla pagina Bustine.`, "error");
      } else {
        show("Errore durante il salvataggio", "error");
      }
      return;
    }

    show(id ? "Modifiche salvate" : "Gioco aggiunto");

    setSaving(false);
    router.push(backUrl);
    router.refresh();
  }

  async function handleDelete() {
    if (!id || !confirm("Eliminare definitivamente questo gioco?")) return;
    const base = isWishlist ? "/api/wishlist" : "/api/games";
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    if (res.ok) {
      show("Gioco eliminato");
      router.push(backUrl);
      router.refresh();
    } else {
      show("Errore durante l'eliminazione", "error");
    }
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
      style={{ color: "var(--text-secondary)" }}>
      {children}
    </label>
  );

  const hasBggInfo = !!(thumbnail || image || bggRating || designers.length || description);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">

      {duplicate && (
        <div className="card flex items-start gap-2 text-sm"
          style={{ borderLeft: "3px solid var(--accent-red)", color: "var(--text-secondary)" }}>
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent-red-light)" }} />
          <div className="flex-1">
            Questo gioco è già {duplicate.kind === "collection" ? "in collezione" : "nella wishlist"}:{" "}
            <Link
              href={`/${duplicate.kind === "collection" ? "collection" : "wishlist"}/${duplicate.id}`}
              className="underline font-medium"
              style={{ color: "var(--accent-blue-light)" }}>
              {duplicate.name}
            </Link>
            {duplicate.status && <span style={{ color: "var(--text-muted)" }}> · {duplicate.status}</span>}
            <span className="block text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Puoi aggiungerlo comunque (es. seconda copia) o annullare.
            </span>
          </div>
        </div>
      )}

      {/* ── BGG Search (primary flow) ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            BoardGameGeek
          </h2>
          {bggId && (
            <div className="flex items-center gap-2">
              <a href={`https://boardgamegeek.com/boardgame/${bggId}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs flex items-center gap-1"
                style={{ color: "var(--text-muted)" }}>
                <ExternalLink size={11} /> BGG #{bggId}
              </a>
              <button type="button" onClick={refreshFromBgg} disabled={saving}
                className="btn-ghost p-1.5 text-xs flex items-center gap-1"
                style={{ color: "var(--accent-blue-light)" }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Aggiorna
              </button>
            </div>
          )}
        </div>

        <BggSearch
          onSelect={applyBggData}
          selectedName={bggSelected && name ? name : undefined}
          onClear={clearBgg}
        />

        {/* No data yet for a linked game — show a fetch button (new games only) */}
        {!id && !hasBggInfo && bggId && (
          <button type="button" onClick={refreshFromBgg} disabled={saving}
            className="btn-secondary text-sm flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Carica copertina e dati da BGG
          </button>
        )}
        {/* Cover + meta — only for new games (edit pages show the hero card above the form) */}
        {!id && hasBggInfo && (
          <div className="flex gap-4 mt-2 p-3 rounded-lg"
            style={{ backgroundColor: "var(--bg-elevated)" }}>
            {(image || thumbnail) && (
              <img src={image || thumbnail} alt={name}
                className="w-24 h-24 object-contain rounded flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              {designers.length > 0 && (
                <p className="text-sm flex items-center gap-1.5"
                  style={{ color: "var(--text-secondary)" }}>
                  <User size={13} style={{ color: "var(--text-muted)" }} />
                  {designers.join(", ")}
                </p>
              )}
              {yearPublished && (
                <p className="text-sm flex items-center gap-1.5"
                  style={{ color: "var(--text-secondary)" }}>
                  <Calendar size={13} style={{ color: "var(--text-muted)" }} />
                  {yearPublished}
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                {bggRating && <span>★ {parseFloat(bggRating).toFixed(1)}</span>}
                {bggWeight && <span>⚖ {parseFloat(bggWeight).toFixed(1)}</span>}
                {minPlayers && maxPlayers && <span>👥 {minPlayers}–{maxPlayers}</span>}
                {playTime && <span>⏱ {playTime}'</span>}
              </div>
              {mechanics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {mechanics.slice(0, 6).map(m => (
                    <span key={m} className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                      {m}
                    </span>
                  ))}
                  {mechanics.length > 6 && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>+{mechanics.length - 6}</span>
                  )}
                </div>
              )}
              {description && (
                <p className="text-xs leading-relaxed line-clamp-3 mt-1"
                  style={{ color: "var(--text-muted)" }}>
                  {description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Nome + tipo + status ── */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Informazioni
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nome *</Label>
            <input type="text" required value={name}
              onChange={e => setName(e.target.value)}
              className="w-full" placeholder="Nome del gioco" />
          </div>
          <div>
            <Label>Tipo</Label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full">
              {GAME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {isWishlist ? (
            <>
              <div>
                <Label>Desiderabilità (1–5)</Label>
                <select value={desirability} onChange={e => setDesirability(e.target.value)} className="w-full">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {"★".repeat(n)}</option>)}
                </select>
              </div>
              <div>
                <Label>Valore stimato</Label>
                <input type="text" value={valueRange} onChange={e => setValueRange(e.target.value)}
                  className="w-full" placeholder="es. 50–70" />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Stato</Label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full">
                  {GAME_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <Label>Costo acquisto (€)</Label>
                <input type="number" step="0.01" min="0" value={cost}
                  onChange={e => setCost(e.target.value)} className="w-full" placeholder="0.00" />
              </div>
              <div>
                <Label>Prezzo vendita (€)</Label>
                <input type="number" step="0.01" min="0" value={salePrice}
                  onChange={e => setSalePrice(e.target.value)} className="w-full" placeholder="0.00" />
              </div>
              <div>
                <Label>Data acquisto</Label>
                <input type="date" value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)} className="w-full" />
              </div>
              <div>
                <Label>Data vendita</Label>
                <input type="date" value={saleDate}
                  onChange={e => setSaleDate(e.target.value)} className="w-full" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Componenti + bustine ── */}
      {!isWishlist && (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Componenti
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Inserto</Label>
              <select value={insert} onChange={e => setInsert(e.target.value)} className="w-full">
                {INSERT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Formati bustine</Label>
            <SleeveEditor value={sleevesData} onChange={setSleevesData} />
          </div>
        </div>
      )}

      {/* ── Note ── */}
      <div className="card">
        <Label>Note</Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={3} className="w-full resize-none" placeholder="Note aggiuntive…" />
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {id ? "Salva modifiche" : "Aggiungi gioco"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Annulla
        </button>
        {id && (
          <button type="button" onClick={handleDelete}
            className="ml-auto text-sm px-3 py-1.5 rounded border transition-colors"
            style={{ borderColor: "var(--accent-red)", color: "var(--accent-red-light)" }}>
            Elimina
          </button>
        )}
      </div>
    </form>
  );
}
