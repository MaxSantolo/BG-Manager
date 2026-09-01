import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Star, Trophy, Clock, Plus } from "lucide-react";
import GameForm from "@/components/GameForm";
import LoanManager from "@/components/LoanManager";
import LogPlayModal from "@/components/LogPlayModal";
import EditPlayModal from "@/components/EditPlayModal";
import StatusBadge from "@/components/StatusBadge";

export default async function GameDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const returnUrl = from ? decodeURIComponent(from) : "/collection";
  const [game, plays, settings] = await Promise.all([
    prisma.game.findUnique({
      where: { id: parseInt(id) },
      include: {
        gameSleeves: { include: { sleeve: true } },
        loans: { orderBy: { loanDate: "desc" } },
      },
    }),
    prisma.play.findMany({
      where: { gameId: parseInt(id) },
      orderBy: { date: "desc" },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!game) notFound();

  let designers: string[] = [];
  try { designers = JSON.parse(game.designers ?? "[]"); } catch { designers = []; }
  let mechanics: string[] = [];
  try { mechanics = JSON.parse(game.mechanics ?? "[]"); } catch { mechanics = []; }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={returnUrl} className="btn-ghost p-1.5 mt-0.5">
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            {game.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <StatusBadge status={game.status} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{game.type}</span>
            {game.yearPublished && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{game.yearPublished}</span>
            )}
            {game.bggId && (
              <a
                href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 hover:underline"
                style={{ color: "var(--accent-blue-light)" }}
              >
                <ExternalLink size={11} /> BGG
              </a>
            )}
          </div>
        </div>
      </div>

      {/* BGG Hero card — always shown if there's any data to display */}
      <div className="card flex gap-5">
        {(game.image || game.thumbnail) ? (
          <img
            src={game.image || game.thumbnail || ""}
            alt={game.name}
            className="w-32 h-32 object-contain rounded flex-shrink-0 self-start"
          />
        ) : (
          <div className="w-32 h-32 rounded flex-shrink-0 self-start flex items-center justify-center text-xs text-center"
            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px dashed var(--border-light)" }}>
            Nessuna copertina
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          {designers.length > 0 && (
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {designers.join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            {game.bggRating && (
              <span className="flex items-center gap-1">
                <Star size={13} fill="var(--accent-red-light)" stroke="none" />
                {game.bggRating.toFixed(1)} / 10
              </span>
            )}
            {game.bggWeight && (
              <span>Complessità: {game.bggWeight.toFixed(1)} / 5</span>
            )}
            {game.minPlayers && game.maxPlayers && (
              <span>{game.minPlayers}–{game.maxPlayers} giocatori</span>
            )}
            {game.playTime && <span>{game.playTime} min</span>}
          </div>
          {game.cost != null && (
            <div className="flex gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              <span>Acquisto: <strong style={{ color: "var(--text-primary)" }}>€{game.cost.toFixed(2)}</strong></span>
              {game.salePrice != null && (
                <span>Vendita: <strong style={{ color: "var(--text-primary)" }}>€{game.salePrice.toFixed(2)}</strong></span>
              )}
            </div>
          )}
          {mechanics.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mechanics.map(m => (
                <span key={m} className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  {m}
                </span>
              ))}
            </div>
          )}
          {game.gameSleeves && game.gameSleeves.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Bustine:</span>
              {game.gameSleeves.map(gs => (
                <span key={gs.id} className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
                  {gs.sleeve.size}{gs.sleeve.label ? ` (${gs.sleeve.label})` : ""} ×{gs.qty}
                </span>
              ))}
            </div>
          )}
          {game.description && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {game.description.slice(0, 400)}{game.description.length > 400 ? "…" : ""}
            </p>
          )}
          {!game.thumbnail && !game.description && designers.length === 0 && game.bggId && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Dati BGG non ancora caricati — usa il modulo qui sotto per aggiornare da BGG.
            </p>
          )}
        </div>
      </div>

      {/* Partite */}
      {(() => {
        const totalSessions = plays.reduce((s, p) => s + p.quantity, 0);
        const totalMinutes  = plays.filter(p => p.duration).reduce((s, p) => s + (p.duration ?? 0) * p.quantity, 0);
        return (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={15} style={{ color: "var(--accent-red-light)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Partite</h2>
                {totalSessions > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                    {totalSessions}×
                    {totalMinutes > 0 && ` · ${Math.round(totalMinutes / 60)}h`}
                  </span>
                )}
              </div>
              <LogPlayModal
                games={[]}
                preselectedGame={{ id: game.id, name: game.name, bggId: game.bggId, thumbnail: game.thumbnail, winMode: game.winMode }}
                bggUsername={settings?.bggUsername ?? ""}
              />
            </div>

            {plays.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessuna partita registrata.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {plays.map(play => {
                  const players: { name: string; win: boolean; score: string; team?: string }[] =
                    play.players ? (() => { try { return JSON.parse(play.players); } catch { return []; } })() : [];
                  return (
                    <div key={play.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                      <div className="flex-shrink-0 text-right" style={{ minWidth: "80px" }}>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(play.date))}
                        </p>
                        {play.duration && (
                          <p className="text-xs flex items-center gap-0.5 justify-end" style={{ color: "var(--text-muted)" }}>
                            <Clock size={10} />{play.duration * play.quantity}m
                          </p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {players.length > 0 && (
                          <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                            {players.map(p => `${p.win ? "🏆 " : ""}${p.name}${p.team ? ` [${p.team}]` : ""}`).join(", ")}
                          </p>
                        )}
                        {play.location && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{play.location}</p>
                        )}
                        {play.notes && (
                          <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>{play.notes}</p>
                        )}
                        {players.length === 0 && !play.location && !play.notes && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>—</p>
                        )}
                      </div>
                      {play.quantity > 1 && (
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>×{play.quantity}</span>
                      )}
                      <EditPlayModal play={play} winMode={game.winMode} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Form */}
      <GameForm mode="collection" initialData={game as never} id={game.id} returnUrl={returnUrl} />
      <LoanManager gameId={game.id} initialLoans={game.loans as never} />
    </div>
  );
}
