"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Loader2, UserPlus, AlertCircle } from "lucide-react";
import { autoWinFlags, TEAMS, type WinMode } from "@/lib/winner";

export interface PlayPlayer {
  name: string;
  username?: string | null;
  score: string;
  win: boolean;
  team?: string;
}

interface RegistryPlayer {
  id: number;
  name: string;
  bggUsername: string | null;
  avatarUrl: string | null;
  playCount: number;
}

interface Props {
  players: PlayPlayer[];
  onChange: (players: PlayPlayer[]) => void;
  /** The game's rule for deciding the winner (drives the 🏆 behaviour). */
  winMode?: WinMode;
}

/** Deterministic tint per name, so anonymous players still read as distinct. */
function initialsColor(name: string): string {
  const palette = ["#2563a8", "#8b1a1a", "#1e3a5f", "#b8860b", "#4a5d3a", "#5c3a5d"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return palette[h % palette.length];
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

export function Avatar({ name, url, size = 26 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" width={size} height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
      style={{
        width: size, height: size,
        backgroundColor: initialsColor(name || "?"),
        color: "var(--text-primary)",
        fontSize: size * 0.4,
      }}>
      {initials(name) || "?"}
    </div>
  );
}

export default function PlayerPicker({ players, onChange, winMode = "manual" }: Props) {
  const [registry, setRegistry] = useState<RegistryPlayer[]>([]);
  const [picking, setPicking]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState("");
  const [newUser, setNewUser]   = useState("");
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/players")
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const list: RegistryPlayer[] = d.players ?? [];
        setRegistry(list);

        // A row seeded from the BGG username alone shows the account name; once
        // the registry is here, prefer the name that history already uses.
        const normalised = players.map(p => {
          if (!p.username || p.name !== p.username) return p;
          const known = list.find(r => r.bggUsername === p.username);
          return known ? { ...p, name: known.name } : p;
        });
        if (normalised.some((p, i) => p.name !== players[i].name)) onChange(normalised);
      })
      .catch(() => setRegistry([]));
    return () => { cancelled = true; };
    // Registry is fetched once per mount; the rows are only read here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatarFor = (p: PlayPlayer) =>
    registry.find(r => r.name === p.name)?.avatarUrl ?? null;

  const auto = winMode === "high" || winMode === "low";

  // For high/low, keep the 🏆 in sync with the scores as they're typed. Returns
  // the list unchanged when no numeric score decides it yet (autoWinFlags null),
  // so manual flags survive until a real score exists.
  function withAutoWins(list: PlayPlayer[]): PlayPlayer[] {
    const flags = autoWinFlags(list, winMode);
    return flags ? list.map((p, i) => ({ ...p, win: flags[i] })) : list;
  }

  function update(i: number, patch: Partial<PlayPlayer>) {
    let next = players.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    if ("score" in patch || "team" in patch) next = withAutoWins(next);
    onChange(next);
  }

  const anyTeams = players.some(p => (p.team ?? "").trim() !== "");

  function remove(i: number) {
    onChange(withAutoWins(players.filter((_, idx) => idx !== i)));
  }

  /** Cooperative games: everyone shares the outcome. */
  function setAllWins(win: boolean) {
    onChange(players.map(p => ({ ...p, win })));
  }

  function addFromRegistry(r: RegistryPlayer) {
    onChange(withAutoWins([...players, { name: r.name, username: r.bggUsername, score: "", win: false }]));
    setPicking(false);
  }

  /** Registers the player so they're reusable next time, then adds them here. */
  async function createAndAdd() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bggUsername: newUser.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Errore");
        return;
      }
      setRegistry(prev => (prev.some(p => p.id === data.id) ? prev : [...prev, { ...data, playCount: data.playCount ?? 0 }]));
      onChange(withAutoWins([...players, { name: data.name, username: data.bggUsername, score: "", win: false }]));
      setNewName(""); setNewUser(""); setCreating(false); setPicking(false);
    } catch {
      setErr("Errore di rete");
    } finally {
      setBusy(false);
    }
  }

  const available = registry.filter(r => !players.some(p => p.name === r.name));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}>Giocatori</label>
        <button type="button" onClick={() => { setPicking(v => !v); setCreating(false); setErr(null); }}
          className="btn-ghost text-xs flex items-center gap-1"
          style={{ color: "var(--accent-blue-light)" }}>
          <Plus size={11} /> Aggiungi
        </button>
      </div>

      {auto && players.length > 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          🏆 automatico al {anyTeams ? "totale di squadra" : "punteggio"} più {winMode === "high" ? "alto" : "basso"}
          {" "}(pareggio = più vincitori). Puoi forzarlo col trofeo.
          {anyTeams && " Squadra = somma dei punteggi dei membri."}
        </p>
      )}

      {winMode === "coop" && players.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: "var(--text-muted)" }}>Esito comune:</span>
          <button type="button" onClick={() => setAllWins(true)}
            className="px-2 py-1 rounded transition-colors"
            style={{
              backgroundColor: players.every(p => p.win) ? "var(--accent-red)" : "transparent",
              border: "1px solid var(--border)", color: "var(--text-primary)",
            }}>
            🏆 Vittoria
          </button>
          <button type="button" onClick={() => setAllWins(false)}
            className="px-2 py-1 rounded transition-colors"
            style={{
              backgroundColor: players.every(p => !p.win) ? "var(--bg-elevated)" : "transparent",
              border: "1px solid var(--border)", color: "var(--text-secondary)",
            }}>
            Sconfitta
          </button>
        </div>
      )}

      {/* current line-up */}
      <div className="space-y-2">
        {players.map((p, i) => (
          // Key by position, not name: rows carry no local state (inputs are
          // controlled by the parent array), and keying on the mutable name
          // remounts the <input> on every keystroke, dropping focus on mobile.
          <div key={i} className="flex items-center gap-2">
            <Avatar name={p.name} url={avatarFor(p)} />
            <input type="text" placeholder="Nome" value={p.name}
              onChange={e => update(i, { name: e.target.value })}
              className="flex-1 text-sm min-w-0" />
            {winMode !== "coop" && (
              <select value={p.team ?? ""} onChange={e => update(i, { team: e.target.value })}
                title="Squadra" style={{ width: "48px" }} className="text-sm flex-shrink-0">
                <option value="">—</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <input type="text" placeholder="Punti" value={p.score}
              onChange={e => update(i, { score: e.target.value })}
              style={{ width: "60px" }} className="text-sm flex-shrink-0" />
            {winMode !== "coop" && (
              <button type="button" onClick={() => update(i, { win: !p.win })}
                title={auto ? "Vincitore (calcolato dai punti, clic per forzare)" : "Vincitore"}
                className="flex-shrink-0 p-1.5 rounded transition-colors"
                style={{
                  backgroundColor: p.win ? "var(--accent-red)" : "transparent",
                  border: "1px solid var(--border)",
                  opacity: p.win ? 1 : 0.5,
                }}>
                🏆
              </button>
            )}
            <button type="button" onClick={() => remove(i)} className="btn-ghost p-1.5 flex-shrink-0">
              <Trash2 size={13} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nessun giocatore.</p>
        )}
      </div>

      {/* picker */}
      {picking && (
        <div className="rounded-lg p-2 space-y-2"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          {!creating ? (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Giocatori salvati
                </span>
                <button type="button" onClick={() => { setCreating(true); setErr(null); }}
                  className="btn-ghost text-xs flex items-center gap-1"
                  style={{ color: "var(--accent-blue-light)" }}>
                  <UserPlus size={11} /> Nuovo
                </button>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-0.5">
                {available.length === 0 && (
                  <p className="text-xs px-1 py-2" style={{ color: "var(--text-muted)" }}>
                    Tutti i giocatori salvati sono già in partita.
                  </p>
                )}
                {available.map(r => (
                  <button key={r.id} type="button" onClick={() => addFromRegistry(r)}
                    className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded text-left transition-colors hover:bg-black/20">
                    <Avatar name={r.name} url={r.avatarUrl} size={22} />
                    <span className="text-sm flex-1 truncate" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                    {r.bggUsername && (
                      <span className="text-xs truncate" style={{ color: "var(--accent-blue-light)" }}>
                        @{r.bggUsername}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r.playCount}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Nuovo giocatore
                </span>
                <button type="button" onClick={() => { setCreating(false); setErr(null); }} className="btn-ghost p-0.5">
                  <X size={13} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nome (es. Luigi C.)" className="w-full text-sm" autoFocus />
              <input type="text" value={newUser} onChange={e => setNewUser(e.target.value)}
                placeholder="Username BGG (facoltativo)" className="w-full text-sm" />
              <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
                Senza username resta un giocatore anonimo: va bene, BGG lo accetta come nome libero.
                Con username viene collegato all&apos;account BGG e ne prende l&apos;immagine.
              </p>
              {err && (
                <p className="text-xs flex items-center gap-1" style={{ color: "var(--accent-red-light)" }}>
                  <AlertCircle size={12} /> {err}
                </p>
              )}
              <button type="button" onClick={createAndAdd} disabled={busy || !newName.trim()}
                className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                {busy ? <><Loader2 size={13} className="animate-spin" /> Salvataggio…</> : <>Aggiungi</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
