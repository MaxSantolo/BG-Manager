"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dec, num } from "./format";

// Coppia validata (dataviz validate_palette, tema scuro su --bg-card): passa
// fascia di luminosità, croma, daltonismo e contrasto. Le due serie si
// distinguono anche per forma: pieno = giocato, anello = mai giocato.
const PLAYED = "#5591dc";
const UNPLAYED = "#e0625a";

interface Point { id: number; name: string; weight: number; rating: number; played: boolean }
interface Centre { count: number; weight: number | null; rating: number | null }
interface Props {
  points: Point[]; played: Centre; unplayed: Centre;
  mechanics: { name: string; games: number; played: number }[];
  baseCount: number;
}

const M = { l: 40, r: 14, t: 14, b: 38 };

function Marker({ played, x, y, r = 4.5 }: { played: boolean; x: number; y: number; r?: number }) {
  return played
    ? <circle cx={x} cy={y} r={r} fill={PLAYED} stroke="var(--bg-card)" strokeWidth={1.5} />
    : <circle cx={x} cy={y} r={r} fill="var(--bg-card)" stroke={UNPLAYED} strokeWidth={2} />;
}

function Scatter({ points, played, unplayed }: Pick<Props, "points" | "played" | "unplayed">) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  // Disegno in pixel veri: con un viewBox scalato, sul telefono i punti diventavano di 2px.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Altezza che segue la larghezza: a 320 fissi su desktop la nuvola era schiacciata.
  const H = Math.round(Math.min(420, Math.max(300, w * 0.42)));
  const ratings = points.map((p) => p.rating);
  const yMin = Math.floor(Math.min(...ratings) * 2) / 2;
  const yMax = Math.ceil(Math.max(...ratings) * 2) / 2;
  const x = (v: number) => M.l + ((v - 1) / 4) * (w - M.l - M.r);
  const y = (v: number) => M.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - M.t - M.b);
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin); v <= yMax; v += 1) yTicks.push(v);
  const hp = points.find((p) => p.id === hover);
  // I mai giocati sopra: sono quelli che si vogliono trovare.
  const ordered = [...points].sort((a, b) => Number(b.played) - Number(a.played));

  const open = (p: Point) => {
    // Sul telefono il primo tocco mostra il nome, il secondo apre il gioco.
    if (hover !== p.id) { setHover(p.id); return; }
    router.push(`/collection/${p.id}?from=${encodeURIComponent("/statistics")}`);
  };

  return (
    <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
      <svg width={w} height={H} role="img"
        aria-label={`Peso e voto BGG di ${points.length} giochi in casa: ${played.count} giocati, ${unplayed.count} mai giocati`}>
        {/* griglia e assi, sottotono */}
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={`x${v}`}>
            <line x1={x(v)} x2={x(v)} y1={M.t} y2={H - M.b} stroke="var(--border)" strokeWidth={1} />
            <text x={x(v)} y={H - M.b + 16} textAnchor="middle" fontSize={11} fill="var(--text-muted)">{v}</text>
          </g>
        ))}
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={M.l} x2={w - M.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">{v}</text>
          </g>
        ))}
        <text x={M.l} y={H - 4} fontSize={11} fill="var(--text-muted)">← leggero</text>
        <text x={(M.l + w - M.r) / 2} y={H - 4} textAnchor="middle" fontSize={11} fill="var(--text-secondary)">Peso BGG</text>
        <text x={w - M.r} y={H - 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">pesante →</text>

        {ordered.map((p) => <Marker key={p.id} played={p.played} x={x(p.weight)} y={y(p.rating)} />)}

        {/* baricentri delle due serie */}
        {[played, unplayed].map((c, i) => c.weight != null && c.rating != null && (
          <g key={i} pointerEvents="none">
            {/* alone del colore dello sfondo, se no la croce si perde fra i punti */}
            <line x1={x(c.weight) - 10} x2={x(c.weight) + 10} y1={y(c.rating)} y2={y(c.rating)} stroke="var(--bg-card)" strokeWidth={6} />
            <line x1={x(c.weight)} x2={x(c.weight)} y1={y(c.rating) - 10} y2={y(c.rating) + 10} stroke="var(--bg-card)" strokeWidth={6} />
            <line x1={x(c.weight) - 9} x2={x(c.weight) + 9} y1={y(c.rating)} y2={y(c.rating)} stroke={i === 0 ? PLAYED : UNPLAYED} strokeWidth={2.5} />
            <line x1={x(c.weight)} x2={x(c.weight)} y1={y(c.rating) - 9} y2={y(c.rating) + 9} stroke={i === 0 ? PLAYED : UNPLAYED} strokeWidth={2.5} />
          </g>
        ))}

        {hp && <circle cx={x(hp.weight)} cy={y(hp.rating)} r={8} fill="none" stroke="var(--text-primary)" strokeWidth={1.5} pointerEvents="none" />}

        {/* bersagli invisibili più grandi del punto */}
        {ordered.map((p) => (
          <circle key={`h${p.id}`} cx={x(p.weight)} cy={y(p.rating)} r={9} fill="transparent" style={{ cursor: "pointer" }}
            onMouseEnter={() => setHover(p.id)} onClick={() => open(p)} />
        ))}
      </svg>

      {hp && (
        <div className="absolute pointer-events-none rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: Math.min(Math.max(x(hp.weight) - 90, 0), w - 180), top: Math.max(y(hp.rating) - 64, 0), width: 180,
            backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)",
          }}>
          <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{hp.name}</p>
          <p>peso {dec(hp.weight)} · voto {dec(hp.rating)}</p>
          <p>{hp.played ? "giocato" : "mai giocato"}</p>
        </div>
      )}
    </div>
  );
}

export default function Taste({ points, played, unplayed, mechanics, baseCount }: Props) {
  const maxM = Math.max(...mechanics.map((m) => m.games), 1);
  const legend = (c: Centre, isPlayed: boolean) => (
    <span className="inline-flex items-center gap-2">
      <svg width={14} height={14} aria-hidden><Marker played={isPlayed} x={7} y={7} /></svg>
      <span>
        <strong style={{ color: "var(--text-primary)" }}>{isPlayed ? "Giocati" : "Mai giocati"}</strong> ({num(c.count)})
        {c.weight != null && c.rating != null && <> · in media peso {dec(c.weight)}, voto {dec(c.rating)}</>}
      </span>
    </span>
  );

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Il tuo gusto</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Peso e voto BGG dei giochi in casa, espansioni escluse ({num(points.length)} su {num(baseCount)}: agli altri BGG non dà peso o voto).
          La croce è la media di ogni gruppo. Un punto mostra il gioco; cliccandolo (sul telefono, toccandolo di nuovo) lo apri.
        </p>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
        {legend(played, true)}
        {legend(unplayed, false)}
      </div>
      {points.length > 0 && <Scatter points={points} played={played} unplayed={unplayed} />}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Le meccaniche che ricorrono</h3>
        <div className="space-y-1.5">
          {mechanics.map((m) => (
            <div key={m.name} className="flex items-center gap-2 text-xs">
              <span className="w-36 sm:w-48 shrink-0 truncate text-right" style={{ color: "var(--text-secondary)" }} title={m.name}>{m.name}</span>
              <div className="flex-1 h-3 flex gap-[2px]" role="img" aria-label={`${m.name}: ${m.games} giochi, ${m.games - m.played} mai giocati`}>
                <div className="h-full rounded-l" style={{ width: `${(m.played / maxM) * 100}%`, backgroundColor: PLAYED }} />
                {m.games > m.played && (
                  <div className="h-full rounded-r" style={{ width: `${((m.games - m.played) / maxM) * 100}%`, backgroundColor: UNPLAYED }} />
                )}
              </div>
              <span className="w-24 shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{num(m.games)}</strong>
                {m.games > m.played && ` · ${num(m.games - m.played)} mai`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
