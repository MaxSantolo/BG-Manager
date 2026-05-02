"use client";

import { useState } from "react";
import { Dice5, RefreshCw, X, ExternalLink, Star, Users, Clock } from "lucide-react";

interface Game {
  id: number;
  name: string;
  thumbnail: string | null;
  image: string | null;
  bggRating: number | null;
  bggWeight: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTime: number | null;
  yearPublished: number | null;
  bggId: number | null;
  total: number;
}

export default function RandomPicker() {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState("");
  const [maxTime, setMaxTime] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [seen, setSeen] = useState<number[]>([]);
  const [noResults, setNoResults] = useState(false);

  async function pick(reset = false) {
    setLoading(true);
    setNoResults(false);
    const exclude = reset ? [] : seen;
    const params = new URLSearchParams();
    if (players) params.set("players", players);
    if (maxTime) params.set("maxTime", maxTime);
    if (exclude.length) params.set("exclude", exclude.join(","));

    const res = await fetch(`/api/games/random?${params}`);
    const data = await res.json();
    setLoading(false);

    if (!data) {
      if (seen.length > 0) {
        setSeen([]);
        pick(true);
      } else {
        setNoResults(true);
        setGame(null);
      }
      return;
    }
    setGame(data);
    setSeen((prev) => (reset ? [data.id] : [...prev, data.id]));
  }

  function open_() {
    setOpen(true);
    setGame(null);
    setSeen([]);
    setNoResults(false);
  }

  function close() {
    setOpen(false);
    setGame(null);
    setSeen([]);
  }

  return (
    <>
      <button onClick={open_} className="btn-primary text-sm flex items-center gap-2">
        <Dice5 size={15} /> Cosa gioco stasera?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="w-full max-w-md rounded-xl shadow-2xl"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <Dice5 size={18} style={{ color: "var(--accent-red-light)" }} />
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Cosa gioco stasera?</span>
              </div>
              <button onClick={close} className="btn-ghost p-1.5">
                <X size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex-1">
                <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                  <Users size={11} className="inline mr-1" />Giocatori
                </label>
                <select value={players} onChange={(e) => { setPlayers(e.target.value); setGame(null); setSeen([]); }} className="w-full text-sm">
                  <option value="">Qualsiasi</option>
                  {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                  <Clock size={11} className="inline mr-1" />Tempo max
                </label>
                <select value={maxTime} onChange={(e) => { setMaxTime(e.target.value); setGame(null); setSeen([]); }} className="w-full text-sm">
                  <option value="">Qualsiasi</option>
                  <option value="30">30 min</option>
                  <option value="60">1 ora</option>
                  <option value="90">90 min</option>
                  <option value="120">2 ore</option>
                  <option value="180">3 ore</option>
                </select>
              </div>
            </div>

            {/* Result */}
            <div className="p-4 min-h-48 flex flex-col items-center justify-center gap-4">
              {!game && !loading && !noResults && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Premi il bottone per scoprire cosa giocare!
                </p>
              )}

              {loading && (
                <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm">Estrazione in corso…</span>
                </div>
              )}

              {noResults && !loading && (
                <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                  Nessun gioco trovato con questi filtri.
                </p>
              )}

              {game && !loading && (
                <div className="w-full space-y-3">
                  <div className="flex gap-4 items-start">
                    {(game.image || game.thumbnail) ? (
                      <img src={game.image || game.thumbnail!} alt={game.name}
                        className="w-24 h-24 object-contain rounded flex-shrink-0" />
                    ) : (
                      <div className="w-24 h-24 rounded flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)", fontSize: "2rem" }}>
                        🎲
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>
                          {game.name}
                        </p>
                        {game.bggId && (
                          <a href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                            target="_blank" rel="noopener noreferrer" className="flex-shrink-0 mt-0.5">
                            <ExternalLink size={13} style={{ color: "var(--text-muted)" }} />
                          </a>
                        )}
                      </div>
                      {game.yearPublished && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{game.yearPublished}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {game.bggRating && (
                          <span className="flex items-center gap-1">
                            <Star size={12} fill="var(--accent-red-light)" stroke="none" />
                            {game.bggRating.toFixed(1)}
                          </span>
                        )}
                        {game.minPlayers && game.maxPlayers && (
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`}
                          </span>
                        )}
                        {game.playTime && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {game.playTime} min
                          </span>
                        )}
                        {game.bggWeight && (
                          <span>⚖ {game.bggWeight.toFixed(1)}/5</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                    {seen.length} di {game.total} giochi estratti
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => pick()} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Dice5 size={15} />}
                {game ? "Ancora!" : "Estrai!"}
              </button>
              {game && (
                <a href={`/collection/${game.id}`} className="btn-secondary text-sm flex items-center gap-1" onClick={close}>
                  Apri gioco
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
