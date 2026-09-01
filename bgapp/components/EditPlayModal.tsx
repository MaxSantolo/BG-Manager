"use client";

import { useState } from "react";
import { Pencil, Trash2, X, Save, Loader2, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { asWinMode } from "@/lib/winner";
import PlayerPicker, { type PlayPlayer } from "./PlayerPicker";
import PlacePicker from "./PlacePicker";


interface Play {
  id: number;
  date: Date | string;
  quantity: number;
  duration: number | null;
  location: string | null;
  notes: string | null;
  incomplete: boolean;
  gameName: string;
  players: string | null;
}

interface Props {
  play: Play;
  /** The game's winner rule; unknown games fall back to "highest wins". */
  winMode?: string | null;
}

function toDateInput(d: Date | string) {
  return new Date(d).toISOString().split("T")[0];
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
    style={{ color: "var(--text-secondary)" }}>{children}</label>
);

export default function EditPlayModal({ play, winMode }: Props) {
  const [open, setOpen]           = useState(false);
  const [date, setDate]           = useState(toDateInput(play.date));
  const [quantity, setQuantity]   = useState(String(play.quantity));
  const [duration, setDuration]   = useState(play.duration ? String(play.duration) : "");
  const [location, setLocation]   = useState(play.location ?? "");
  const [notes, setNotes]         = useState(play.notes ?? "");
  const [incomplete, setIncomplete] = useState(play.incomplete);
  const [players, setPlayers]     = useState<PlayPlayer[]>(() => {
    try { return play.players ? JSON.parse(play.players) : []; } catch { return []; }
  });
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ bgg?: { error?: string } }>(`/api/plays/${play.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date, quantity: parseInt(quantity) || 1,
          duration: duration ? parseInt(duration) : null,
          location: location || null, notes: notes || null,
          incomplete, gameName: play.gameName,
          players: players.filter(p => p.name.trim()),
        }),
      });

      if (res.timedOut) {
        setError("Salvataggio lento. La modifica dovrebbe essere applicata: ricarica per verificare.");
        return;
      }
      if (res.networkError) { setError("Connessione assente. Riprova."); return; }
      if (!res.ok) { setError("Errore durante il salvataggio."); return; }
      // Saved locally either way; only the BGG leg can fail on its own — surface
      // it but still close, since the edit itself succeeded.
      if (res.data?.bgg?.error) {
        setError(`Salvato in locale, ma non su BGG: ${res.data.bgg.error}`);
        return;
      }
      setOpen(false);
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Eliminare questa partita? Verrà rimossa anche da BGG.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await apiFetch<{ error?: string; hint?: string }>(`/api/plays/${play.id}`, { method: "DELETE" });

      if (res.timedOut) {
        setError("Eliminazione lenta. Verrà completata a breve: ricarica per verificare.");
        return;
      }
      if (res.networkError) { setError("Connessione assente. Riprova."); return; }
      if (!res.ok) {
        setError([res.data?.error, res.data?.hint].filter(Boolean).join(" ") || "Eliminazione non riuscita.");
        return;
      }
      setOpen(false);
      window.location.reload();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost p-1" title="Modifica">
        <Pencil size={13} style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <div className="modal-shell fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full max-w-lg rounded-xl shadow-2xl my-4"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>

            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="font-semibold truncate pr-4" style={{ color: "var(--text-primary)" }}>
                {play.gameName}
              </span>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5 flex-shrink-0">
                <X size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Data</Label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full" required />
                  </div>
                  <div>
                    <Label>Quantità</Label>
                    <input type="number" min="1" max="99" value={quantity}
                      onChange={e => setQuantity(e.target.value)} className="w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Durata (min)</Label>
                    <input type="number" min="0" value={duration}
                      onChange={e => setDuration(e.target.value)} className="w-full" placeholder="—" />
                  </div>
                  <div>
                    <Label>Luogo</Label>
                    <PlacePicker value={location} onChange={setLocation} />
                  </div>
                </div>

                <PlayerPicker players={players} onChange={setPlayers} winMode={asWinMode(winMode)} />

                <div>
                  <Label>Note</Label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={2} className="w-full resize-none text-sm" placeholder="Note…" />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={incomplete} onChange={e => setIncomplete(e.target.checked)} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Partita incompleta</span>
                </label>

                {error && (
                  <div className="flex items-start gap-2 text-sm p-3 rounded-lg"
                    style={{ backgroundColor: "var(--bg-elevated)", color: "var(--accent-red-light)" }}>
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {error}
                  </div>
                )}
              </div>

              <div className="flex gap-2 p-4 border-t" style={{ borderColor: "var(--border)" }}>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio…</> : <><Save size={14} /> Salva</>}
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="btn-ghost flex items-center gap-1.5 text-sm px-3"
                  style={{ color: "var(--accent-red-light)" }}>
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Elimina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
