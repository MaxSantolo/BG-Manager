"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Image as ImageIcon, Calendar, Dices, Clock } from "lucide-react";

interface ReportGame {
  key: string;
  name: string;
  thumbnail: string | null;
  plays: number;
  ratio: number;
}

interface Report {
  from: string;
  to: string;
  totalPlays: number;
  totalGames: number;
  totalMinutes: number;
  games: ReportGame[];
}

export interface Preset { label: string; from: string; to: string }

export default function ReportTool({ presets }: { presets: Preset[] }) {
  // Defaults come from the server so "today" is computed once, in the user's
  // timezone, with no hydration mismatch.
  const [from, setFrom]   = useState(presets[0].from);
  const [to, setTo]       = useState(presets[0].to);
  const [title, setTitle] = useState("Partite giocate");
  const [badges, setBadges] = useState(true);
  const [report, setReport] = useState<(Report & { key: string }) | null>(null);
  const [generating, setGenerating] = useState(false);

  // Loading is derived: the result remembers which range produced it.
  const rangeKey = `${from}|${to}`;
  const loading  = report?.key !== rangeKey;

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    fetch(`/api/report?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setReport({ ...d, key: rangeKey }); })
      .catch(() => {
        if (!cancelled)
          setReport({ from, to, totalPlays: 0, totalGames: 0, totalMinutes: 0, games: [], key: rangeKey });
      });
    return () => { cancelled = true; };
  }, [from, to, rangeKey]);

  /** Fetch as a blob so the file downloads with a sensible name. */
  async function downloadImage() {
    setGenerating(true);
    try {
      const url = `/api/report/collage?from=${from}&to=${to}`
        + `&title=${encodeURIComponent(title)}${badges ? "&badges=1" : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `partite-${from}_${to}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } finally {
      setGenerating(false);
    }
  }

  const hours = report ? Math.round(report.totalMinutes / 60) : 0;
  const activePreset = presets.find(p => p.from === from && p.to === to)?.label;

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button key={p.label} type="button"
              onClick={() => { setFrom(p.from); setTo(p.to); }}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: activePreset === p.label ? "var(--accent-red)" : "var(--bg-elevated)",
                color: activePreset === p.label ? "var(--text-primary)" : "var(--text-secondary)",
                border: `1px solid ${activePreset === p.label ? "var(--accent-red)" : "var(--border)"}`,
              }}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}>Dal</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}>Al</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}>Titolo</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full" maxLength={60} placeholder="Partite giocate" />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={badges} onChange={e => setBadges(e.target.checked)} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Mostra il numero di partite sulle copertine giocate più volte
          </span>
        </label>
      </div>

      {/* summary + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: "var(--text-secondary)" }}>
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Calcolo…</span>
          ) : report ? (
            <>
              <span className="flex items-center gap-1.5"><Dices size={14} />
                <strong style={{ color: "var(--text-primary)" }}>{report.totalPlays}</strong> partite</span>
              <span className="flex items-center gap-1.5"><ImageIcon size={14} />
                <strong style={{ color: "var(--text-primary)" }}>{report.totalGames}</strong> giochi</span>
              {hours > 0 && (
                <span className="flex items-center gap-1.5"><Clock size={14} />
                  <strong style={{ color: "var(--text-primary)" }}>{hours}</strong> ore</span>
              )}
            </>
          ) : null}
        </div>

        <button type="button" onClick={downloadImage}
          disabled={generating || loading || !report?.games.length}
          className="btn-primary text-sm flex items-center gap-2">
          {generating
            ? <><Loader2 size={14} className="animate-spin" /> Genero l&apos;immagine…</>
            : <><Download size={14} /> Scarica collage</>}
        </button>
      </div>

      {/* preview */}
      {loading ? (
        <div className="card flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={15} className="animate-spin" /> Caricamento…
        </div>
      ) : !report?.games.length ? (
        <div className="card text-center py-10">
          <Calendar size={22} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nessuna partita in questo periodo.
          </p>
        </div>
      ) : (
        <div className="card space-y-3">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Anteprima — nell&apos;immagine scaricata le copertine sono le stesse, distribuite in
            colonne bilanciate, con titolo e statistiche in cima.
          </p>
          <div className="columns-3 sm:columns-4 lg:columns-6 gap-1.5">
            {report.games.map(g => (
              <div key={g.key} title={`${g.name} — ${g.plays}x`}
                className="relative rounded overflow-hidden mb-1.5 break-inside-avoid"
                style={{ backgroundColor: "var(--bg-elevated)" }}>
                {g.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.thumbnail} alt={g.name}
                    className="w-full h-auto block" loading="lazy" />
                ) : (
                  <div className="w-full flex items-center justify-center text-center px-1 py-6"
                    style={{ color: "var(--text-muted)", fontSize: 9 }}>
                    {g.name.slice(0, 20)}
                  </div>
                )}
                {badges && g.plays > 1 && (
                  <span className="absolute bottom-0 right-0 px-1 text-[10px] font-semibold rounded-tl"
                    style={{ backgroundColor: "var(--accent-red)", color: "var(--text-primary)" }}>
                    {g.plays}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
