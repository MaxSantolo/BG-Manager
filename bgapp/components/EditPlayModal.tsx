"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, X, Save, Loader2 } from "lucide-react";

interface Player { name: string; win: boolean; score: string; }

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
}

function toDateInput(d: Date | string) {
  return new Date(d).toISOString().split("T")[0];
}

export default function EditPlayModal({ play }: Props) {
  const [open, setOpen]           = useState(false);
  const [date, setDate]           = useState(toDateInput(play.date));
  const [quantity, setQuantity]   = useState(String(play.quantity));
  const [duration, setDuration]   = useState(play.duration ? String(play.duration) : "");
  const [location, setLocation]   = useState(play.location ?? "");
  const [notes, setNotes]         = useState(play.notes ?? "");
  const [incomplete, setIncomplete] = useState(play.incomplete);
  const [players, setPlayers]     = useState<Player[]>(() => {
    try { return play.players ? JSON.parse(play.players) : []; } catch { return []; }
  });
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);

  function addPlayer()                              { setPlayers(p => [...p, { name: "", win: false, score: "" }]); }
  function removePlayer(i: number)                  { setPlayers(p => p.filter((_, idx) => idx !== i)); }
  function updatePlayer(i: number, patch: Partial<Player>) {
    setPlayers(p => p.map((pl, idx) => idx === i ? { ...pl, ...patch } : pl));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/plays/${play.id}`, {
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
    setSaving(false);
    setOpen(false);
    window.location.reload();
  }

  async function handleDelete() {
    if (!confirm("Eliminare questa partita?")) return;
    setDeleting(true);
    await fetch(`/api/plays/${play.id}`, { method: "DELETE" });
    setDeleting(false);
    setOpen(false);
    window.location.reload();
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
      style={{ color: "var(--text-secondary)" }}>{children}</label>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost p-1" title="Modifica">
        <Pencil size={13} style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
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
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                      className="w-full" placeholder="es. Casa" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Giocatori</Label>
                    <button type="button" onClick={addPlayer}
                      className="btn-ghost text-xs flex items-center gap-1"
                      style={{ color: "var(--accent-blue-light)" }}>
                      <Plus size={11} /> Aggiungi
                    </button>
                  </div>
                  <div className="space-y-2">
                    {players.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" placeholder="Nome" value={p.name}
                          onChange={e => updatePlayer(i, { name: e.target.value })} className="flex-1 text-sm" />
                        <input type="text" placeholder="Punti" value={p.score}
                          onChange={e => updatePlayer(i, { score: e.target.value })}
                          style={{ width: "68px" }} className="text-sm" />
                        <button type="button" onClick={() => updatePlayer(i, { win: !p.win })}
                          className="flex-shrink-0 p-1.5 rounded transition-colors"
                          style={{ backgroundColor: p.win ? "var(--accent-red)" : "transparent", border: "1px solid var(--border)" }}>
                          🏆
                        </button>
                        <button type="button" onClick={() => removePlayer(i)} className="btn-ghost p-1.5 flex-shrink-0">
                          <Trash2 size={13} style={{ color: "var(--text-muted)" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Note</Label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={2} className="w-full resize-none text-sm" placeholder="Note…" />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={incomplete} onChange={e => setIncomplete(e.target.checked)} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Partita incompleta</span>
                </label>
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
