"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDay } from "@/lib/dates";

const DAY = 86_400_000;
const LABEL_W = 28; // colonna lun/mer/ven
const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MONTHS_LONG = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** 0 = niente; poi quattro intensità del rosso del tema. */
function level(n: number) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n <= 4) return 3;
  return 4;
}
const COLORS = ["var(--bg-input)", "rgba(192,52,52,0.32)", "rgba(192,52,52,0.52)", "rgba(192,52,52,0.76)", "rgb(220,70,70)"];

/** Settimane (colonne) dell'anno, da lunedì: anche i giorni a cavallo con l'anno prima/dopo, vuoti. */
function weeksOf(year: number) {
  const jan1 = Date.UTC(year, 0, 1);
  const dec31 = Date.UTC(year, 11, 31);
  const start = jan1 - ((new Date(jan1).getUTCDay() + 6) % 7) * DAY;
  const end = dec31 + (6 - ((new Date(dec31).getUTCDay() + 6) % 7)) * DAY;
  const weeks: { key: string; inYear: boolean }[][] = [];
  for (let t = start; t <= end; t += 7 * DAY) {
    weeks.push(Array.from({ length: 7 }, (_, i) => {
      const k = iso(t + i * DAY);
      return { key: k, inYear: k.startsWith(String(year)) };
    }));
  }
  return weeks;
}

/**
 * Calendario delle partite stile GitHub: un quadratino per giorno, più scuro
 * quante più partite. `today` arriva dal server (giorno di Roma) così il disegno
 * è identico in server e browser e i giorni futuri si riconoscono.
 */
export default function PlaysHeatmap({ days, today, title = "Calendario delle partite" }: {
  days: Record<string, number>; today: string; title?: string;
}) {
  const thisYear = Number(today.slice(0, 4));
  const years = useMemo(() => {
    const ys = new Set(Object.keys(days).map((k) => Number(k.slice(0, 4))));
    ys.add(thisYear);
    return [...ys].sort((a, b) => a - b);
  }, [days, thisYear]);
  const [year, setYear] = useState(thisYear);
  const weeks = useMemo(() => weeksOf(year), [year]);
  const scroller = useRef<HTMLDivElement>(null);

  // Se non ci sta (telefono) il calendario scorre: si parte con oggi sul bordo
  // destro, non col 31 dicembre, altrimenti si vedono solo mesi vuoti.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const t = el.querySelector<HTMLElement>("[data-today]");
    el.scrollLeft = t ? t.offsetLeft + t.offsetWidth + 24 - el.clientWidth : 0;
  }, [year]);

  // Riepilogo dell'anno scelto.
  const summary = useMemo(() => {
    const keys = Object.keys(days).filter((k) => k.startsWith(String(year)) && days[k] > 0).sort();
    const total = keys.reduce((s, k) => s + days[k], 0);
    let best = 0, run = 0, prev = 0;
    for (const k of keys) {
      const t = Date.parse(k + "T00:00:00Z");
      run = prev && t - prev === DAY ? run + 1 : 1;
      best = Math.max(best, run);
      prev = t;
    }
    const byMonth = new Array(12).fill(0);
    for (const k of keys) byMonth[Number(k.slice(5, 7)) - 1] += days[k];
    const topMonth = byMonth.indexOf(Math.max(...byMonth));
    return { total, active: keys.length, best, topMonth: total > 0 ? topMonth : -1, topMonthCount: byMonth[topMonth] };
  }, [days, year]);

  // Etichetta del mese sopra la settimana che ne contiene il giorno 1.
  const monthLabels = weeks.map((w) => {
    const first = w.find((d) => d.inYear && d.key.endsWith("-01"));
    return first ? MONTHS[Number(first.key.slice(5, 7)) - 1] : "";
  });

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{title}</h2>
        {years.length > 1 && (
          <div className="flex gap-1">
            {years.map((y) => (
              <button key={y} type="button" onClick={() => setYear(y)} aria-pressed={y === year}
                className="text-xs px-2 py-1 rounded-md"
                style={{
                  backgroundColor: y === year ? "rgba(192, 52, 52, 0.16)" : "transparent",
                  color: y === year ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: y === year ? "inset 0 0 0 1px rgba(244, 125, 116, 0.25)" : "none",
                }}>
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Griglia fluida: riempie la card su desktop, sotto gli 11px a cella scorre.
          I giorni stanno fuori dalla griglia: dentro, uno sticky resta chiuso nella
          sua cella e scorre via; qui il contenitore è largo quanto il contenuto. */}
      <div ref={scroller} className="relative overflow-x-auto pb-1">
        <div className="flex" role="img"
          aria-label={`Calendario ${year}: ${summary.total} partite in ${summary.active} giorni`}
          style={{ minWidth: LABEL_W + weeks.length * 14 - 3, maxWidth: LABEL_W + weeks.length * 24 }}>
          <div className="sticky left-0 z-10 shrink-0 grid gap-[3px]"
            style={{ width: LABEL_W, gridTemplateRows: "16px repeat(7, 1fr)", backgroundColor: "var(--bg-card)" }}>
            {["", "lun", "", "mer", "", "ven", "", ""].map((d, i) => (
              <span key={i} className="flex items-center text-[10px] leading-none" style={{ color: "var(--text-muted)" }}>{d}</span>
            ))}
          </div>
          <div className="flex-1 min-w-0 grid gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${weeks.length}, minmax(11px, 1fr))`,
              gridTemplateRows: "16px repeat(7, auto)",
              gridAutoFlow: "column",
            }}>
            {weeks.map((w, wi) => [
              <span key={`m${wi}`} className="text-[10px] leading-4 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                {monthLabels[wi]}
              </span>,
              ...w.map((d) => {
                if (!d.inYear) return <span key={d.key} />;
                const n = days[d.key] ?? 0;
                const future = d.key > today;
                return (
                  <span key={d.key} className="aspect-square rounded-[3px]" data-today={d.key === today || undefined}
                    title={future ? formatDay(d.key) : `${formatDay(d.key)} · ${n === 0 ? "nessuna partita" : n === 1 ? "1 partita" : `${n} partite`}`}
                    style={{
                      backgroundColor: COLORS[level(n)],
                      opacity: future ? 0.35 : 1,
                      outline: d.key === today ? "1px solid var(--accent-red-light)" : undefined,
                    }} />
                );
              }),
            ])}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>
          <strong style={{ color: "var(--text-primary)" }}>{summary.total}</strong> partite in{" "}
          <strong style={{ color: "var(--text-primary)" }}>{summary.active}</strong> giorni di gioco
          {summary.best > 1 && <> · serie più lunga <strong style={{ color: "var(--text-primary)" }}>{summary.best}</strong> giorni di fila</>}
          {summary.topMonth >= 0 && <> · mese più giocato <strong style={{ color: "var(--text-primary)" }}>{MONTHS_LONG[summary.topMonth]}</strong> ({summary.topMonthCount})</>}
        </span>
        <span className="inline-flex items-center gap-1">
          meno
          {COLORS.map((c, i) => <span key={i} className="w-3 h-3 rounded-[3px] inline-block" style={{ backgroundColor: c }} />)}
          più
        </span>
      </div>
    </div>
  );
}
