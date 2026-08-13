"use client";

import { useState } from "react";
import { Plus, X, Loader2, CheckCircle, AlertCircle, Trophy, Search } from "lucide-react";
import type { BggGameDetail } from "@/lib/bgg";
import { apiFetch } from "@/lib/fetchClient";
import PlayerPicker, { type PlayPlayer } from "./PlayerPicker";
import PlacePicker from "./PlacePicker";

interface Game {
  id: number;
  name: string;
  bggId: number | null;
  thumbnail: string | null;
}

interface Props {
  games: Game[];
  bggUsername?: string;
  preselectedGame?: Game;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
    style={{ color: "var(--text-secondary)" }}>{children}</label>
);

export default function LogPlayModal({ games, bggUsername, preselectedGame }: Props) {
  const [open, setOpen] = useState(false);

  const [gameId, setGameId]             = useState<number | "other" | "">(preselectedGame?.id ?? "");
  const [gameQuery, setGameQuery]       = useState("");   // typeahead over the collection
  const [freeGameName, setFreeGameName] = useState("");
  const [bggQuery, setBggQuery]         = useState("");
  const [bggResults, setBggResults]     = useState<{ id: number; name: string; year?: number }[]>([]);
  const [bggSearching, setBggSearching] = useState(false);
  const [bggPicked, setBggPicked]       = useState<BggGameDetail | null>(null);
  const [date, setDate]             = useState(todayStr());
  const [quantity, setQuantity]     = useState("1");
  const [duration, setDuration]     = useState("");
  const [location, setLocation]     = useState("");
  const [notes, setNotes]           = useState("");
  const [incomplete, setIncomplete] = useState(false);
  const [players, setPlayers]       = useState<PlayPlayer[]>([{ name: bggUsername ?? "", username: bggUsername ?? null, win: false, score: "" }]);

  const [saving, setSaving]     = useState(false);
  // `done` = the local save succeeded (show "Fatto", never re-arm submit);
  // `ok`   = fully clean (green). A local-only save is done-but-not-ok.
  const [result, setResult]     = useState<{ ok: boolean; done: boolean; msg: string } | null>(null);

  const isOther      = gameId === "other";
  // On the game detail page the modal is opened with a preselectedGame and an
  // empty games list, so resolve to it directly — otherwise the lookup misses,
  // the name comes out empty, and the save is blocked.
  const selectedGame = isOther ? null : (preselectedGame ?? games.find(g => g.id === gameId));

  // Collection games matching what's typed — first-letters/substring, capped.
  const gameMatches = gameQuery.trim()
    ? games.filter(g => g.name.toLowerCase().includes(gameQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  async function searchBgg(q: string) {
    setBggQuery(q);
    setBggPicked(null);
    if (!q.trim()) { setBggResults([]); return; }
    setBggSearching(true);
    try {
      const res = await fetch(`/api/bgg?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setBggResults(Array.isArray(data) ? data : []);
    } finally {
      setBggSearching(false);
    }
  }

  async function pickBggGame(bggId: number) {
    setBggSearching(true);
    setBggResults([]);
    try {
      const res = await fetch(`/api/bgg?id=${bggId}`);
      const detail: BggGameDetail = await res.json();
      setBggPicked(detail);
      setBggQuery(detail.name);
      setFreeGameName(detail.name);
    } finally {
      setBggSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const resolvedName = isOther
      ? (bggPicked?.name ?? freeGameName.trim())
      : (selectedGame?.name ?? "");
    if (!gameId || !resolvedName || !date) {
      setResult({ ok: false, done: false, msg: "Seleziona un gioco e una data." });
      return;
    }
    setSaving(true);
    setResult(null);

    try {
      // For external games: find-or-create via ensure-guest.
      let resolvedGameId: number | null = selectedGame?.id ?? null;
      if (isOther && bggPicked) {
        const gr = await apiFetch<{ id: number }>("/api/games/ensure-guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bggId: bggPicked.id, name: bggPicked.name,
            thumbnail: bggPicked.thumbnail, image: bggPicked.image,
            bggRating: bggPicked.bggRating, bggWeight: bggPicked.bggWeight,
            minPlayers: bggPicked.minPlayers, maxPlayers: bggPicked.maxPlayers,
            playTime: bggPicked.playTime, yearPublished: bggPicked.yearPublished,
          }),
        });
        if (gr.ok && gr.data) resolvedGameId = gr.data.id;
      }

      const playData = {
        bggGameId: isOther ? (bggPicked?.id ?? null) : (selectedGame?.bggId ?? null),
        date,
        quantity:  parseInt(quantity) || 1,
        duration:  duration ? parseInt(duration) : null,
        location:  location || null,
        notes:     notes || null,
        incomplete,
        players:   players.filter(p => p.name.trim()),
      };

      const res = await apiFetch<{ bgg?: { pushed?: boolean; pending?: boolean; error?: string } }>(
        "/api/plays",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameName: resolvedName, gameId: resolvedGameId, ...playData }),
        },
      );

      // The request took longer than the connection could hold. The play is
      // saved locally first, server-side, so it almost certainly landed — say
      // so and let "Fatto" reload, rather than inviting a duplicate re-submit.
      if (res.timedOut) {
        setResult({ ok: false, done: true, msg: "Salvataggio lento. La partita dovrebbe essere registrata: verifica nell'elenco." });
        return;
      }
      if (res.networkError) {
        setResult({ ok: false, done: false, msg: "Connessione assente. Riprova." });
        return;
      }
      if (!res.ok) {
        setResult({ ok: false, done: false, msg: "Errore salvataggio." });
        return;
      }
      // Saved locally regardless; a failed BGG push is not a failed save, so
      // this is `done` — the form must not re-arm and let the user duplicate it.
      if (res.data?.bgg?.error) {
        setResult({ ok: false, done: true, msg: `Registrata in locale, ma non su BGG: ${res.data.bgg.error}` });
        return;
      }
      setResult({
        ok: true,
        done: true,
        msg: res.data?.bgg?.pushed
          ? "Partita registrata e caricata su BGG."
          : res.data?.bgg?.pending
            ? "Partita registrata. Sincronizzazione con BGG in corso."
            : "Partita registrata.",
      });
    } finally {
      setSaving(false);
    }
  }

  function close() {
    setOpen(false);
    setResult(null);
    setGameId(preselectedGame?.id ?? "");
    setGameQuery("");
    setFreeGameName("");
    setBggQuery("");
    setBggResults([]);
    setBggPicked(null);
    setDate(todayStr());
    setQuantity("1");
    setDuration("");
    setLocation("");
    setNotes("");
    setIncomplete(false);
    setPlayers([{ name: bggUsername ?? "", username: bggUsername ?? null, win: false, score: "" }]);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm flex items-center gap-2">
        <Plus size={14} /> Registra partita
      </button>

      {open && (
        <div className="modal-shell fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="w-full max-w-lg rounded-xl shadow-2xl my-4"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>

            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <Trophy size={16} style={{ color: "var(--accent-red-light)" }} />
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Registra partita</span>
              </div>
              <button onClick={close} className="btn-ghost p-1.5">
                <X size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-4 space-y-4">
                {preselectedGame ? (
                  <div>
                    <Label>Gioco</Label>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {preselectedGame.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Gioco *</Label>

                    {selectedGame && !isOther ? (
                      /* A collection game is chosen — show it, with a way to change */
                      <div className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ backgroundColor: "var(--bg-elevated)" }}>
                        {selectedGame.thumbnail && (
                          <img src={selectedGame.thumbnail} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                        )}
                        <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {selectedGame.name}
                        </span>
                        <button type="button" onClick={() => { setGameId(""); setGameQuery(""); }}
                          className="btn-ghost text-xs" style={{ color: "var(--text-muted)" }}>
                          Cambia
                        </button>
                      </div>
                    ) : isOther ? (
                      /* Game not in the collection — search BGG or type a name */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Gioco non in collezione</span>
                          <button type="button"
                            onClick={() => { setGameId(""); setBggPicked(null); setBggQuery(""); setFreeGameName(""); }}
                            className="btn-ghost text-xs" style={{ color: "var(--accent-blue-light)" }}>
                            ← Dalla collezione
                          </button>
                        </div>
                        {/* BGG search */}
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2"
                            style={{ color: "var(--text-muted)" }} />
                          <input
                            type="text"
                            value={bggQuery}
                            onChange={e => searchBgg(e.target.value)}
                            placeholder="Cerca su BGG…"
                            className="w-full pl-8 text-sm"
                            autoFocus
                          />
                          {bggSearching && (
                            <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin"
                              style={{ color: "var(--text-muted)" }} />
                          )}
                        </div>
                        {bggResults.length > 0 && !bggPicked && (
                          <div className="rounded-lg overflow-hidden border text-sm"
                            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elevated)" }}>
                            {bggResults.slice(0, 8).map(r => (
                              <button key={r.id} type="button"
                                onClick={() => pickBggGame(r.id)}
                                className="w-full text-left px-3 py-1.5 hover:bg-white/5 flex items-center justify-between gap-2">
                                <span style={{ color: "var(--text-primary)" }}>{r.name}</span>
                                {r.year && <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{r.year}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                        {bggPicked ? (
                          <div className="flex items-center gap-2 p-2 rounded-lg"
                            style={{ backgroundColor: "var(--bg-elevated)" }}>
                            {bggPicked.thumbnail && (
                              <img src={bggPicked.thumbnail} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                            )}
                            <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {bggPicked.name}
                            </span>
                            <button type="button" onClick={() => { setBggPicked(null); setBggQuery(""); setFreeGameName(""); }}
                              className="btn-ghost p-1">
                              <X size={13} style={{ color: "var(--text-muted)" }} />
                            </button>
                          </div>
                        ) : (
                          !bggQuery && (
                            <input type="text" value={freeGameName} onChange={e => setFreeGameName(e.target.value)}
                              placeholder="…o inserisci il nome manualmente" className="w-full text-sm" />
                          )
                        )}
                      </div>
                    ) : (
                      /* Typeahead over the collection */
                      <>
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2"
                            style={{ color: "var(--text-muted)" }} />
                          <input
                            type="text"
                            value={gameQuery}
                            onChange={e => setGameQuery(e.target.value)}
                            placeholder="Cerca nella collezione…"
                            className="w-full pl-8 text-sm"
                            autoFocus
                          />
                        </div>
                        {gameMatches.length > 0 && (
                          <div className="rounded-lg overflow-hidden border text-sm max-h-56 overflow-y-auto"
                            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elevated)" }}>
                            {gameMatches.map(g => (
                              <button key={g.id} type="button"
                                onClick={() => { setGameId(g.id); setGameQuery(""); }}
                                className="w-full text-left px-3 py-1.5 hover:bg-white/5 flex items-center gap-2">
                                {g.thumbnail
                                  ? <img src={g.thumbnail} alt="" className="w-6 h-6 object-contain rounded flex-shrink-0" />
                                  : <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-card)" }} />}
                                <span style={{ color: "var(--text-primary)" }}>{g.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {gameQuery.trim() && gameMatches.length === 0 && (
                          <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
                            Nessun gioco in collezione corrisponde.
                          </p>
                        )}
                        <button type="button"
                          onClick={() => { setGameId("other"); setGameQuery(""); setFreeGameName(""); }}
                          className="btn-ghost text-xs flex items-center gap-1" style={{ color: "var(--accent-blue-light)" }}>
                          <Plus size={11} /> Gioco non in collezione (cerca su BGG)
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Data *</Label>
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

                <PlayerPicker players={players} onChange={setPlayers} />

                <div>
                  <Label>Note</Label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={2} className="w-full resize-none text-sm" placeholder="Note…" />
                </div>

                {result && (
                  <div className="flex items-start gap-2 text-sm p-3 rounded-lg"
                    style={{ backgroundColor: "var(--bg-elevated)" }}>
                    {result.ok
                      ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#4ade80" }} />
                      : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent-red-light)" }} />}
                    <span style={{ color: result.ok ? "#4ade80" : "var(--accent-red-light)" }}>{result.msg}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 p-4 border-t" style={{ borderColor: "var(--border)" }}>
                {result?.done ? (
                  <button type="button" onClick={() => { close(); window.location.reload(); }} className="btn-primary flex-1">
                    Fatto
                  </button>
                ) : (
                  <>
                    <button type="submit" disabled={saving}
                      className="btn-primary flex-1 flex items-center justify-center gap-2">
                      {saving
                        ? <><Loader2 size={14} className="animate-spin" /> Salvataggio…</>
                        : <><Trophy size={14} /> Registra</>}
                    </button>
                    <button type="button" onClick={close} className="btn-secondary">Annulla</button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
