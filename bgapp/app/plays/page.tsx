import { prisma } from "@/lib/prisma";
import { Trophy, Clock, Dices, Users } from "lucide-react";
import PlaysImporter from "@/components/PlaysImporter";
import LogPlayModal from "@/components/LogPlayModal";
import EditPlayModal from "@/components/EditPlayModal";
import Link from "next/link";
import { FileImage } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default async function PlaysPage() {
  const [rawPlays, statPlays, topGames, settings, collectionGamesForLog, collectionGames] = await Promise.all([
    prisma.play.findMany({
      orderBy: { date: "desc" },
      take: 100,
      select: {
        id: true, date: true, quantity: true, duration: true,
        gameName: true, bggGameId: true, gameId: true,
        players: true, location: true, notes: true, incomplete: true,
        game: { select: { winMode: true } },
      },
    }),
    // All plays (lightweight) — stats must cover the whole history, not just the last 100
    prisma.play.findMany({
      select: { quantity: true, duration: true, bggGameId: true, gameName: true },
    }),
    prisma.play.groupBy({
      by: ["gameName", "bggGameId", "gameId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.game.findMany({
      where: { status: "InCollezione" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, bggId: true, thumbnail: true, winMode: true },
    }),
    // For linking each play/top-game to its collection page.
    prisma.game.findMany({ where: { bggId: { not: null } }, select: { id: true, bggId: true } }),
  ]);

  // Stats — computed over the entire play history
  const totalSessions = statPlays.reduce((s, p) => s + p.quantity, 0);
  const totalMinutes  = statPlays
    .filter(p => p.duration)
    .reduce((s, p) => s + (p.duration ?? 0) * p.quantity, 0);
  const uniqueGames   = new Set(statPlays.map(p => p.bggGameId ?? p.gameName)).size;

  // Index collection games by bggId for links
  const gameIdByBggId = new Map(collectionGames.map(g => [g.bggId!, g.id]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Partite</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Storico importato da BoardGameGeek
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LogPlayModal
            games={collectionGamesForLog}
            bggUsername={settings?.bggUsername ?? ""}
          />
          <Link href="/report" className="btn-secondary text-sm flex items-center gap-2">
            <FileImage size={14} /> Report
          </Link>
          <PlaysImporter
            initialUsername={settings?.bggUsername ?? ""}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center space-y-1">
          <Dices size={20} className="mx-auto" style={{ color: "var(--accent-blue-light)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalSessions}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Partite giocate</p>
        </div>
        <div className="card text-center space-y-1">
          <Clock size={20} className="mx-auto" style={{ color: "var(--text-muted)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {totalMinutes > 0 ? formatDuration(totalMinutes) : "—"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Ore di gioco</p>
        </div>
        <div className="card text-center space-y-1">
          <Trophy size={20} className="mx-auto" style={{ color: "var(--accent-red-light)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{uniqueGames}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Giochi diversi</p>
        </div>
        <div className="card text-center space-y-1">
          <Users size={20} className="mx-auto" style={{ color: "var(--text-muted)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {topGames[0]?._sum.quantity ?? "—"}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
            {topGames[0]?.gameName ? `Max: ${topGames[0].gameName}` : "Nessuna partita"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top games */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Più giocati</h2>
          {topGames.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessuna partita ancora.</p>
          ) : (
            <div className="space-y-2">
              {topGames.map((g, i) => {
                const collId = g.gameId ?? (g.bggGameId ? gameIdByBggId.get(g.bggGameId) : null);
                const inner = (
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-5 text-right font-mono flex-shrink-0"
                      style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                    <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {g.gameName}
                    </span>
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                      ×{g._sum.quantity}
                    </span>
                  </div>
                );
                return collId
                  ? <Link key={g.gameName} href={`/collection/${collId}`} className="block py-1"
                      style={{ textDecoration: "none" }}>{inner}</Link>
                  : <div key={g.gameName} className="py-1">{inner}</div>;
              })}
            </div>
          )}
        </div>

        {/* Play log */}
        <div className="card space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Ultime {rawPlays.length} partite
          </h2>
          {rawPlays.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Nessuna partita importata. Usa il pulsante &quot;Importa da BGG&quot; in alto.
            </p>
          ) : (
            <div className="divide-y overflow-x-auto" style={{ borderColor: "var(--border)" }}>
              {rawPlays.map(play => {
                const collId = play.gameId ?? (play.bggGameId ? gameIdByBggId.get(play.bggGameId) : null);
                const parsedPlayers: { name: string; win: boolean; score: string; team?: string }[] = play.players
                  ? (() => { try { return JSON.parse(play.players); } catch { return []; } })()
                  : [];
                const winners = parsedPlayers.filter(p => p.win).map(p => p.name);

                return (
                  <div key={play.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                    <div className="flex-shrink-0 text-right" style={{ minWidth: "80px" }}>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatDate(new Date(play.date))}
                      </p>
                      {play.duration && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatDuration(play.duration * play.quantity)}
                        </p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {collId ? (
                        <Link href={`/collection/${collId}`}
                          className="text-sm font-medium truncate block"
                          style={{ color: "var(--accent-blue-light)", textDecoration: "none" }}>
                          {play.gameName}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {play.gameName}
                        </p>
                      )}
                      {parsedPlayers.length > 0 && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                          {parsedPlayers.map(p => `${p.win ? "🏆 " : ""}${p.name}${p.team ? ` [${p.team}]` : ""}`).join(", ")}
                        </p>
                      )}
                      {winners.length > 0 && parsedPlayers.length === 0 && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>🏆 {winners.join(", ")}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {play.quantity > 1 && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>×{play.quantity}</span>
                      )}
                      <EditPlayModal play={play} winMode={play.game?.winMode} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
