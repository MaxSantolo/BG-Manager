"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dice5, Users, Clock, Brain, Star, Loader2, RotateCcw, Info } from "lucide-react";

interface Game {
  id: number;
  name: string;
  thumbnail: string | null;
  bggId: number | null;
  bggRating: number | null;
  bggWeight: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTime: number | null;
  yearPublished: number | null;
  type: string;
}

interface Result {
  games: Game[];
  total: number;
  unknown: { weight: number; time: number; players: number };
}

/** Weight presets in BGG's 1–5 scale, phrased the way people actually decide. */
const WEIGHTS = [
  { label: "Qualsiasi",   min: "", max: "" },
  { label: "Leggero",     min: "", max: "2" },
  { label: "Medio",       min: "2", max: "3" },
  { label: "Impegnativo", min: "3", max: "4" },
  { label: "Pesante",     min: "4", max: "" },
];

const TIMES = [
  { label: "Qualsiasi", max: "" },
  { label: "≤ 30 min",  max: "30" },
  { label: "≤ 60 min",  max: "60" },
  { label: "≤ 90 min",  max: "90" },
  { label: "≤ 2 ore",   max: "120" },
];

const PLAYERS = ["", "1", "2", "3", "4", "5", "6"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
      style={{
        backgroundColor: active ? "var(--accent-red)" : "var(--bg-elevated)",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--accent-red)" : "var(--border)"}`,
      }}>
      {children}
    </button>
  );
}

function fmtTime(mins: number | null) {
  if (!mins) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h${m}` : `${h}h`;
}

export default function DecideTool() {
  const [players, setPlayers]   = useState("");
  const [weightIdx, setWeightIdx] = useState(0);
  const [timeIdx, setTimeIdx]   = useState(0);
  const [expansions, setExpansions] = useState(false);
  const [sort, setSort]         = useState("rating");

  const [result, setResult]     = useState<(Result & { key: string }) | null>(null);
  const [picked, setPicked]     = useState<Game | null>(null);

  // Loading is derived rather than stored: the result carries the filters it
  // was fetched for, so a mismatch *is* the pending state. Keeps the effect
  // free of synchronous setState.
  const filterKey = `${players}|${weightIdx}|${timeIdx}|${expansions}|${sort}`;
  const loading   = result?.key !== filterKey;

  useEffect(() => {
    let cancelled = false;
    const w = WEIGHTS[weightIdx], t = TIMES[timeIdx];
    const params = new URLSearchParams();
    if (players) params.set("players", players);
    if (w.min) params.set("minWeight", w.min);
    if (w.max) params.set("maxWeight", w.max);
    if (t.max) params.set("maxTime", t.max);
    if (expansions) params.set("expansions", "1");
    params.set("sort", sort);

    fetch(`/api/games/decide?${params}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setResult({ ...d, key: filterKey }); })
      .catch(() => {
        if (!cancelled)
          setResult({ games: [], total: 0, unknown: { weight: 0, time: 0, players: 0 }, key: filterKey });
      });

    return () => { cancelled = true; };
  }, [filterKey, players, weightIdx, timeIdx, expansions, sort]);

  // Re-rolling only makes sense against the set currently on screen.
  function pickRandom() {
    const pool = result?.games ?? [];
    if (!pool.length) return;
    setPicked(pool[Math.floor(Math.random() * pool.length)]);
  }

  function reset() {
    setPlayers(""); setWeightIdx(0); setTimeIdx(0); setExpansions(false); setSort("rating");
    setPicked(null);
  }

  const games = result?.games ?? [];
  const unknown = result?.unknown;
  const excluded = (unknown?.weight ?? 0) + (unknown?.time ?? 0);

  return (
    <div className="space-y-6">
      {/* filters */}
      <div className="card space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Users size={13} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}>Giocatori</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PLAYERS.map(p => (
              <Chip key={p || "any"} active={players === p} onClick={() => setPlayers(p)}>
                {p === "" ? "Qualsiasi" : p === "6" ? "6+" : p}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Brain size={13} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}>Peso</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEIGHTS.map((w, i) => (
              <Chip key={w.label} active={weightIdx === i} onClick={() => setWeightIdx(i)}>{w.label}</Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Clock size={13} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}>Durata</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t, i) => (
              <Chip key={t.label} active={timeIdx === i} onClick={() => setTimeIdx(i)}>{t.label}</Chip>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={expansions} onChange={e => setExpansions(e.target.checked)} />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Includi espansioni</span>
          </label>
          <div className="flex items-center gap-2">
            <select value={sort} onChange={e => setSort(e.target.value)} className="text-sm">
              <option value="rating">Voto BGG</option>
              <option value="weight">Peso</option>
              <option value="time">Durata</option>
              <option value="name">Nome</option>
            </select>
            <button type="button" onClick={reset} className="btn-ghost text-sm flex items-center gap-1.5">
              <RotateCcw size={13} /> Azzera
            </button>
          </div>
        </div>
      </div>

      {/* verdict */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {loading
            ? "Ricerca…"
            : <><strong style={{ color: "var(--text-primary)" }}>{games.length}</strong> giochi compatibili</>}
        </p>
        <button type="button" onClick={pickRandom} disabled={!games.length || loading}
          className="btn-primary text-sm flex items-center gap-2">
          <Dice5 size={14} /> Scegli per me
        </button>
      </div>

      {excluded > 0 && (
        <div className="flex items-start gap-2 text-xs p-3 rounded-lg"
          style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}>
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          <span>
            {unknown!.weight > 0 && `${unknown!.weight} giochi senza peso`}
            {unknown!.weight > 0 && unknown!.time > 0 && " e "}
            {unknown!.time > 0 && `${unknown!.time} senza durata`}
            {" "}non compaiono con questi filtri: mancano i dati BGG. Usa
            {" "}<Link href="/collection" className="underline" style={{ color: "var(--accent-blue-light)" }}>
              Arricchisci da BGG
            </Link> nella collezione per completarli.
          </span>
        </div>
      )}

      {/* the draw */}
      {picked && (
        <div className="card flex items-center gap-4"
          style={{ border: "1px solid var(--accent-red)" }}>
          {picked.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picked.thumbnail} alt="" className="w-20 h-20 object-contain rounded flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--accent-red-light)" }}>
              Stasera si gioca a
            </p>
            <Link href={`/collection/${picked.id}`}
              className="text-xl font-bold hover:underline block truncate"
              style={{ color: "var(--text-primary)" }}>
              {picked.name}
            </Link>
            <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: "var(--text-secondary)" }}>
              <span className="flex items-center gap-1"><Users size={11} />{picked.minPlayers}–{picked.maxPlayers}</span>
              <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(picked.playTime)}</span>
              {picked.bggWeight && <span className="flex items-center gap-1"><Brain size={11} />{picked.bggWeight.toFixed(1)}</span>}
              {picked.bggRating && <span className="flex items-center gap-1"><Star size={11} />{picked.bggRating.toFixed(1)}</span>}
            </div>
          </div>
          <button type="button" onClick={pickRandom} className="btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0">
            <RotateCcw size={13} /> Un altro
          </button>
        </div>
      )}

      {/* shortlist */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={15} className="animate-spin" /> Caricamento…
        </div>
      ) : games.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nessun gioco con questi filtri. Prova ad allargare peso o durata.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {games.map(g => (
            <Link key={g.id} href={`/collection/${g.id}`}
              className="card flex items-center gap-3 hover:opacity-80 transition-opacity"
              style={picked?.id === g.id ? { border: "1px solid var(--accent-red)" } : undefined}>
              {g.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.thumbnail} alt="" className="w-12 h-12 object-contain rounded flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{g.name}</p>
                <div className="flex items-center gap-2.5 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-0.5"><Users size={10} />{g.minPlayers ?? "?"}–{g.maxPlayers ?? "?"}</span>
                  <span className="flex items-center gap-0.5"><Clock size={10} />{fmtTime(g.playTime)}</span>
                  {g.bggWeight != null && <span className="flex items-center gap-0.5"><Brain size={10} />{g.bggWeight.toFixed(1)}</span>}
                  {g.bggRating != null && <span className="flex items-center gap-0.5"><Star size={10} />{g.bggRating.toFixed(1)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
