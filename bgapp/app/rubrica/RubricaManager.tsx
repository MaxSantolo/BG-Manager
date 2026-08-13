"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, Loader2, MapPin, Merge } from "lucide-react";
import { Avatar } from "@/components/PlayerPicker";
import { apiFetch } from "@/lib/fetchClient";

interface Player {
  id: number; name: string; bggUsername: string | null; avatarUrl: string | null; playCount: number;
}
interface Place {
  id: number; name: string; imageUrl: string | null; playCount: number;
}

export default function RubricaManager({
  initialPlayers, initialPlaces,
}: { initialPlayers: Player[]; initialPlaces: Place[] }) {
  const [players, setPlayers] = useState(initialPlayers);
  const [places, setPlaces]   = useState(initialPlaces);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Giocatori ({players.length})
        </h2>
        {players.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessun giocatore.</p>}
        {players.map(p => (
          <PlayerRow key={p.id} player={p} allPlayers={players}
            onChange={u => setPlayers(ps => ps.map(x => x.id === u.id ? u : x))}
            onDelete={id => setPlayers(ps => ps.filter(x => x.id !== id))}
            onMerged={(removedId) => setPlayers(ps => ps.filter(x => x.id !== removedId))} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Luoghi ({places.length})
        </h2>
        {places.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessun luogo.</p>}
        {places.map(pl => (
          <PlaceRow key={pl.id} place={pl}
            onChange={u => setPlaces(ps => ps.map(x => x.id === u.id ? u : x))}
            onDelete={id => setPlaces(ps => ps.filter(x => x.id !== id))} />
        ))}
      </section>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide mb-0.5"
        style={{ color: "var(--text-secondary)" }}>{label}</span>
      <input {...props} className="w-full text-sm" />
    </label>
  );
}

function PlayerRow({ player, allPlayers, onChange, onDelete, onMerged }: {
  player: Player; allPlayers: Player[];
  onChange: (p: Player) => void; onDelete: (id: number) => void; onMerged: (removedId: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(player.name);
  const [user, setUser]       = useState(player.bggUsername ?? "");
  const [img, setImg]         = useState(player.avatarUrl ?? "");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setErr("Nome richiesto"); return; }
    setBusy(true); setErr(null);
    const res = await apiFetch<Player & { error?: string }>(`/api/players/${player.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bggUsername: user, avatarUrl: img }),
    });
    setBusy(false);
    if (res.timedOut || res.networkError) { setErr("Connessione assente. Riprova."); return; }
    if (!res.ok || !res.data || res.data.error) { setErr(res.data?.error ?? "Errore"); return; }
    onChange(res.data); setEditing(false);
  }

  async function remove() {
    if (!confirm(`Eliminare "${player.name}"? Le partite non vengono toccate.`)) return;
    setBusy(true);
    const res = await apiFetch(`/api/players/${player.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) onDelete(player.id); else setErr("Eliminazione non riuscita.");
  }

  async function mergeInto(intoId: number) {
    const target = allPlayers.find(p => p.id === intoId);
    if (!target || !confirm(`Unire "${player.name}" in "${target.name}"? "${player.name}" sparirà.`)) return;
    setBusy(true); setErr(null);
    const res = await apiFetch<{ error?: string }>(`/api/players/merge`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromId: player.id, intoId }),
    });
    setBusy(false);
    if (!res.ok || res.data?.error) { setErr(res.data?.error ?? "Unione non riuscita."); return; }
    onMerged(player.id);
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-3">
        <Avatar name={player.name} url={player.avatarUrl} size={34} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{player.name}</p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {player.bggUsername ? `@${player.bggUsername} · ` : ""}{player.playCount} partite
          </p>
        </div>
        {!editing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost p-1.5" title="Modifica" disabled={busy}>
              <Pencil size={14} style={{ color: "var(--text-muted)" }} />
            </button>
            <button type="button" onClick={remove} className="btn-ghost p-1.5" title="Elimina" disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} style={{ color: "var(--accent-red-light)" }} />}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="space-y-2 pt-1">
          <Field label="Nome" value={name} onChange={e => setName(e.target.value)} />
          <Field label="Username BGG (facoltativo)" value={user} onChange={e => setUser(e.target.value)}
            placeholder="collega per l'avatar BGG" />
          <Field label="Immagine URL (facoltativo)" value={img} onChange={e => setImg(e.target.value)}
            placeholder="https://… (ha priorità sull'avatar BGG)" />
          {err && <p className="text-xs" style={{ color: "var(--accent-red-light)" }}>{err}</p>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={busy} className="btn-primary text-sm flex items-center gap-1.5">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salva
            </button>
            <button type="button" onClick={() => { setEditing(false); setName(player.name); setUser(player.bggUsername ?? ""); setImg(player.avatarUrl ?? ""); setErr(null); }}
              className="btn-secondary text-sm flex items-center gap-1.5"><X size={13} /> Annulla</button>

            {allPlayers.length > 1 && (
              <label className="ml-auto flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <Merge size={13} />
                <select className="text-xs" defaultValue=""
                  onChange={e => { const v = Number(e.target.value); if (v) mergeInto(v); e.target.value = ""; }}>
                  <option value="">Unisci a…</option>
                  {allPlayers.filter(p => p.id !== player.id).map(p =>
                    <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
      )}
      {!editing && err && <p className="text-xs" style={{ color: "var(--accent-red-light)" }}>{err}</p>}
    </div>
  );
}

function PlaceRow({ place, onChange, onDelete }: {
  place: Place; onChange: (p: Place) => void; onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(place.name);
  const [img, setImg]         = useState(place.imageUrl ?? "");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setErr("Nome richiesto"); return; }
    setBusy(true); setErr(null);
    const res = await apiFetch<Place & { error?: string }>(`/api/places/${place.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, imageUrl: img }),
    });
    setBusy(false);
    if (res.timedOut || res.networkError) { setErr("Connessione assente. Riprova."); return; }
    if (!res.ok || !res.data || res.data.error) { setErr(res.data?.error ?? "Errore"); return; }
    onChange(res.data); setEditing(false);
  }

  async function remove() {
    if (!confirm(`Eliminare "${place.name}"? Le partite non vengono toccate.`)) return;
    setBusy(true);
    const res = await apiFetch(`/api/places/${place.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) onDelete(place.id); else setErr("Eliminazione non riuscita.");
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-3">
        {place.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={place.imageUrl} alt="" className="w-[34px] h-[34px] rounded object-cover flex-shrink-0" />
          : <div className="w-[34px] h-[34px] rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "var(--bg-elevated)" }}>
              <MapPin size={16} style={{ color: "var(--text-muted)" }} />
            </div>}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{place.name}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{place.playCount} partite</p>
        </div>
        {!editing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost p-1.5" title="Modifica" disabled={busy}>
              <Pencil size={14} style={{ color: "var(--text-muted)" }} />
            </button>
            <button type="button" onClick={remove} className="btn-ghost p-1.5" title="Elimina" disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} style={{ color: "var(--accent-red-light)" }} />}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="space-y-2 pt-1">
          <Field label="Nome" value={name} onChange={e => setName(e.target.value)} />
          <Field label="Immagine URL (facoltativo)" value={img} onChange={e => setImg(e.target.value)}
            placeholder="https://…" />
          {err && <p className="text-xs" style={{ color: "var(--accent-red-light)" }}>{err}</p>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={busy} className="btn-primary text-sm flex items-center gap-1.5">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salva
            </button>
            <button type="button" onClick={() => { setEditing(false); setName(place.name); setImg(place.imageUrl ?? ""); setErr(null); }}
              className="btn-secondary text-sm flex items-center gap-1.5"><X size={13} /> Annulla</button>
          </div>
        </div>
      )}
      {!editing && err && <p className="text-xs" style={{ color: "var(--accent-red-light)" }}>{err}</p>}
    </div>
  );
}
