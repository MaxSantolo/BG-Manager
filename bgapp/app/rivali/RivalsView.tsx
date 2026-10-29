"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Flame, Swords } from "lucide-react";
import { formatDay } from "@/lib/dates";
import { headToHead, type PlayerStats, type RivalPlay } from "@/lib/rivals";

/** Sotto questa soglia di partite niente scheda: finiscono tra gli occasionali. */
const REGULAR = 3;

function initials(name: string) {
  const w = name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? "?").slice(0, 1)).toUpperCase();
}
function hue(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0 select-none"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        backgroundColor: `hsl(${hue(name)} 42% 30%)`, color: `hsl(${hue(name)} 70% 88%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue(name)} 45% 45% / 0.6)`,
      }} aria-hidden>
      {initials(name)}
    </span>
  );
}

const pct = (w: number, c: number) => (c > 0 ? Math.round((w / c) * 100) : 0);
const volte = (n: number) => (n === 1 ? "1 volta" : `${n} volte`);

export default function RivalsView({ plays, stats, initialA, initialB }: {
  plays: RivalPlay[]; stats: PlayerStats[]; initialA: string; initialB: string;
}) {
  const [pair, setPair] = useState({ a: initialA, b: initialB });
  const [allGames, setAllGames] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const h = useMemo(() => headToHead(plays, pair.a, pair.b), [plays, pair]);
  const byName = useMemo(() => new Map(stats.map((s) => [s.name, s])), [stats]);
  const regulars = stats.filter((s) => s.plays >= REGULAR);
  const occasional = stats.filter((s) => s.plays < REGULAR);

  function choose(side: "a" | "b", name: string) {
    setAllGames(false);
    setPair((p) => {
      const next = { ...p, [side]: name };
      // Stessa persona su entrambi i lati: l'altro lato passa al suo compagno abituale.
      if (next.a === next.b) {
        const other = side === "a" ? "b" : "a";
        next[other] = byName.get(name)?.companion?.name ?? stats.find((s) => s.name !== name)!.name;
      }
      return next;
    });
  }
  // Dalla scheda: confronta con chi è già a sinistra; se è proprio lui, col suo compagno abituale.
  function compare(name: string) {
    const b = name !== pair.a ? name : byName.get(name)?.companion?.name;
    if (b) choose("b", b);
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const decided = h.aWins + h.bWins;
  const select = (k: "a" | "b") => (
    <select value={pair[k]} onChange={(e) => choose(k, e.target.value)}
      aria-label={k === "a" ? "Primo giocatore" : "Secondo giocatore"} className="text-sm w-full min-w-0">
      {stats.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.plays})</option>)}
    </select>
  );
  const games = allGames ? h.games : h.games.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Testa a testa */}
      <div ref={panel} className="card space-y-5 scroll-mt-20">
        <div className="flex items-center gap-2">
          <Swords size={16} style={{ color: "var(--accent-red-light)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Testa a testa</h2>
        </div>

        {/* Avatar e punteggio su una riga, i due selettori sotto: sul telefono
            accanto al punteggio diventavano troppo stretti per leggere il nome. */}
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
            <div className="justify-self-start"><Avatar name={pair.a} size={48} /></div>
            <div className="flex flex-col items-center gap-1 px-1">
              <p className="text-3xl sm:text-4xl font-bold tabular-nums whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                <span style={{ color: h.aWins > h.bWins ? "var(--accent-red-light)" : undefined }}>{h.aWins}</span>
                <span className="mx-1.5 sm:mx-2" style={{ color: "var(--text-muted)" }}>–</span>
                <span style={{ color: h.bWins > h.aWins ? "var(--accent-red-light)" : undefined }}>{h.bWins}</span>
              </p>
              <button type="button" onClick={() => setPair((p) => ({ a: p.b, b: p.a }))}
                className="btn-ghost text-xs inline-flex items-center gap-1">
                <ArrowLeftRight size={12} /> scambia
              </button>
            </div>
            <div className="justify-self-end"><Avatar name={pair.b} size={48} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {select("a")}
            {select("b")}
          </div>
        </div>

        {h.together === 0 ? (
          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
            {pair.a} e {pair.b} non hanno mai giocato insieme.
          </p>
        ) : (
          <>
            {decided > 0 && (
              <div className="h-2.5 rounded-full overflow-hidden flex" style={{ backgroundColor: "var(--bg-input)" }}
                role="img" aria-label={`${pair.a} ${h.aWins}, ${pair.b} ${h.bWins}`}>
                <div style={{ width: `${(h.aWins / decided) * 100}%`, backgroundColor: `hsl(${hue(pair.a)} 55% 55%)` }} />
                <div style={{ width: `${(h.bWins / decided) * 100}%`, backgroundColor: `hsl(${hue(pair.b)} 55% 55%)` }} />
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-center" style={{ color: "var(--text-muted)" }}>
              <span><strong style={{ color: "var(--text-primary)" }}>{h.together}</strong> partite insieme</span>
              {h.even > 0 && <span>{h.even} senza un vincitore tra i due</span>}
              {h.last && (
                <span>
                  ultima: {formatDay(h.last.date)}, {h.last.game}
                  {h.last.winner ? <> · vince <strong style={{ color: "var(--text-primary)" }}>{h.last.winner}</strong></> : ""}
                </span>
              )}
              {h.streak && (
                <span className="inline-flex items-center gap-1" style={{ color: "var(--accent-red-light)" }}>
                  <Flame size={12} /> {h.streak.name} ne ha vinte {h.streak.count} di fila
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Gioco</th>
                    <th className="text-right">Insieme</th>
                    <th className="text-right max-w-24 truncate">{pair.a}</th>
                    <th className="text-right max-w-24 truncate">{pair.b}</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => (
                    <tr key={g.name}>
                      <td className="text-sm font-medium">
                        {g.gameId
                          ? <Link href={`/collection/${g.gameId}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>{g.name}</Link>
                          : g.name}
                      </td>
                      <td className="text-right text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>{g.together}</td>
                      <td className="text-right text-sm tabular-nums"
                        style={{ color: g.aWins > g.bWins ? "var(--accent-red-light)" : "var(--text-primary)", fontWeight: g.aWins > g.bWins ? 600 : 400 }}>{g.aWins}</td>
                      <td className="text-right text-sm tabular-nums"
                        style={{ color: g.bWins > g.aWins ? "var(--accent-red-light)" : "var(--text-primary)", fontWeight: g.bWins > g.aWins ? 600 : 400 }}>{g.bWins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {h.games.length > 8 && (
              <button type="button" onClick={() => setAllGames((v) => !v)} className="btn-ghost text-xs">
                {allGames ? "Mostra meno" : `Tutti i ${h.games.length} giochi`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Schede */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {regulars.map((s) => (
          <div key={s.name} className="card space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={s.name} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.plays} partite · ultima {formatDay(s.lastPlayed)}
                </p>
              </div>
              <button type="button" onClick={() => compare(s.name)} className="btn-ghost text-xs inline-flex items-center gap-1"
                title={`Confronta ${s.name}`}>
                <Swords size={12} /> Confronta
              </button>
            </div>

            {s.contested > 0 && (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>Vittorie</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {s.contested >= REGULAR && <strong className="mr-1" style={{ color: "var(--text-primary)" }}>{pct(s.wins, s.contested)}%</strong>}
                    {s.wins} su {s.contested}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-input)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct(s.wins, s.contested)}%`, backgroundColor: "var(--accent-red)" }} />
                </div>
              </div>
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              {s.companion && <Row label="Gioca di più con" value={s.companion.name} note={`${s.companion.count}`} />}
              {s.nemesis && <Row label="Perde più spesso contro" value={s.nemesis.name} note={volte(s.nemesis.count)} />}
              {s.victim && <Row label="Vince più spesso contro" value={s.victim.name} note={volte(s.victim.count)} />}
              {s.favourite && <Row label="Gioco preferito" value={s.favourite.name} note={`${s.favourite.count}`} />}
              {s.strongest && <Row label="Il suo gioco" value={s.strongest.name} note={`${s.strongest.wins} su ${s.strongest.contested}`} />}
            </dl>
          </div>
        ))}
      </div>

      {occasional.length > 0 && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Occasionali</h2>
          <div className="flex flex-wrap gap-2">
            {occasional.map((s) => (
              <button key={s.name} type="button" onClick={() => compare(s.name)}
                className="inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-xs"
                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)" }}
                title={`Confronta ${s.name}`}>
                <Avatar name={s.name} size={22} /> {s.name} <span style={{ color: "var(--text-muted)" }}>{s.plays}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <>
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd className="min-w-0 truncate text-right" style={{ color: "var(--text-primary)" }}>
        {value} <span style={{ color: "var(--text-muted)" }}>({note})</span>
      </dd>
    </>
  );
}
