import { prisma } from "@/lib/prisma";
import { dayInput } from "@/lib/dates";
import { canonicalizer, toRivalPlays, playerStats } from "@/lib/rivals";
import RivalsView from "./RivalsView";

export const dynamic = "force-dynamic";

export default async function RivaliPage() {
  const [registry, rows, settings] = await Promise.all([
    prisma.player.findMany({ select: { name: true, bggUsername: true, aliases: true } }),
    prisma.play.findMany({
      select: {
        id: true, date: true, quantity: true, gameName: true, gameId: true, players: true,
        game: { select: { winMode: true } },
      },
    }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { bggUsername: true } }),
  ]);

  const reg = registry.map((p) => {
    let aliases: string[] = [];
    try { aliases = JSON.parse(p.aliases); } catch { /* alias illeggibili: solo il nome */ }
    return { name: p.name, bggUsername: p.bggUsername, aliases: Array.isArray(aliases) ? aliases : [] };
  });
  const plays = toRivalPlays(
    rows.map((r) => ({
      id: r.id, date: dayInput(r.date), quantity: r.quantity, gameName: r.gameName,
      gameId: r.gameId, coop: r.game?.winMode === "coop", players: r.players,
    })),
    canonicalizer(reg),
  );
  const stats = playerStats(plays);

  // Il padrone di casa è chi ha lo username BGG delle impostazioni: parte lui a sinistra.
  const user = settings?.bggUsername?.trim().toLowerCase();
  const owner = reg.find((p) => user && p.bggUsername?.trim().toLowerCase() === user)?.name;
  const me = stats.find((s) => s.name === owner) ?? stats[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Rivali</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Chi gioca con chi, e chi batte chi. Vittorie e sconfitte contano solo nelle partite con un vincitore e un vinto:
          cooperative, partite da soli e quelle in cui hanno vinto tutti contano come partite, non come sfide.
        </p>
      </div>
      {stats.length < 2 ? (
        <div className="card text-sm" style={{ color: "var(--text-muted)" }}>Servono partite con almeno due giocatori.</div>
      ) : (
        <RivalsView plays={plays} stats={stats} initialA={me.name} initialB={me.companion?.name ?? stats.find((s) => s.name !== me.name)!.name} />
      )}
    </div>
  );
}
