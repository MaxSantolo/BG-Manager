import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Library, Heart, BookOpen, BarChart3, Plus, Truck, Sparkles, Dices, MapPin, Users, Clock } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import RandomPicker from "@/components/RandomPicker";
import SyncAllButton from "@/components/SyncAllButton";
import PlaysHeatmap from "@/components/PlaysHeatmap";
import { OUT_OF_COLLECTION } from "@/lib/status";
import { findNeverPlayed } from "@/lib/neverPlayed";
import { playsByDay } from "@/lib/playCalendar";
import { parsePlayers } from "@/lib/playPlayers";
import { APP_TZ, dayInput, formatDay, formatDayNum, todayInput } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * La home parla della collezione di adesso: la stessa della pagina Collezione
 * (in casa: niente venduti, preordini, ospiti), così il numero sulla tessera è
 * quello che si trova cliccandola.
 */
const IN_COLLECTION = { status: { notIn: OUT_OF_COLLECTION } };

const DAY = 86_400_000;
/** Giorni da `from` a `to`, entrambi "AAAA-MM-GG" (giorni di calendario, UTC). */
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
const eur = (n: number) => `€${n.toFixed(2)}`;
const giorni = (n: number) => (n === 1 ? "1 giorno" : `${n} giorni`);

function playedLabel(day: string, today: string) {
  const n = daysBetween(day, today);
  if (n === 0) return "oggi";
  if (n === 1) return "ieri";
  if (n > 1 && n < 7) return `${n} giorni fa`;
  return formatDay(day);
}

function etaLabel(eta: string | null, today: string): { text: string; late: boolean } {
  if (!eta) return { text: "senza data", late: false };
  const n = daysBetween(today, eta);
  if (n < 0) return { text: `in ritardo di ${giorni(-n)}`, late: true };
  if (n === 0) return { text: "oggi", late: false };
  if (n === 1) return { text: "domani", late: false };
  if (n <= 7) return { text: `tra ${n} giorni`, late: false };
  return { text: formatDayNum(eta), late: false };
}

/** Sempre lo stesso per tutto il giorno, cambia a mezzanotte (di Roma). */
function pickOfTheDay<T>(items: T[], today: string): T | null {
  if (!items.length) return null;
  let h = 5381;
  for (const c of today) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return items[h % items.length];
}

function Section({ title, href, children, className = "" }: {
  title: string; href?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
        {href ? <Link href={href} style={{ color: "inherit", textDecoration: "none" }}>{title} →</Link> : title}
      </h2>
      {children}
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  return src
    ? <img src={src} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
    : <div className="w-8 h-8 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />;
}

export default async function Home() {
  const today = todayInput(APP_TZ);
  const [totalGames, wishlistCount, loans, recentGames, aggregate, preorders, neverPlayed, recentPlays, days] =
    await Promise.all([
      prisma.game.count({ where: IN_COLLECTION }),
      prisma.wishlistGame.count(),
      prisma.loan.findMany({
        where: { returned: false },
        orderBy: { loanDate: "asc" },
        select: { id: true, borrower: true, loanDate: true, game: { select: { id: true, name: true, thumbnail: true } } },
      }),
      prisma.game.findMany({
        where: IN_COLLECTION,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, thumbnail: true, status: true },
      }),
      // "Investito" = quanto hai speso: i giochi solo giocati come ospite non
      // sono un acquisto, quindi restano fuori (i venduti sì, li avevi comprati).
      prisma.game.aggregate({ _sum: { cost: true }, where: { NOT: { status: "GiocatoEsterno" } } }),
      prisma.game.findMany({
        where: { status: "Preordinato" },
        orderBy: [{ preorderEta: { sort: "asc", nulls: "last" } }, { name: "asc" }],
        select: {
          id: true, name: true, thumbnail: true, cost: true, preorderEta: true, preorderPaid: true,
          preorderSource: { select: { name: true } },
        },
      }),
      findNeverPlayed(),
      prisma.play.findMany({
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 5,
        select: { id: true, date: true, quantity: true, gameName: true, gameId: true, bggGameId: true, players: true },
      }),
      playsByDay(),
    ]);

  // Le partite che la sincronizzazione non ha legato a un gioco (solo bggGameId)
  // si collegano lo stesso, come nella pagina Partite.
  const unlinked = recentPlays.filter((p) => !p.gameId && p.bggGameId).map((p) => p.bggGameId!);
  const byBgg = new Map(unlinked.length
    ? (await prisma.game.findMany({ where: { bggId: { in: unlinked } }, select: { id: true, bggId: true } }))
        .map((g) => [g.bggId!, g.id])
    : []);

  const totalInvested = aggregate._sum.cost ?? 0;
  const toPay = preorders.filter((g) => !g.preorderPaid).reduce((s, g) => s + (g.cost ?? 0), 0);
  const pick = pickOfTheDay(neverPlayed, today);
  const todayLong = new Intl.DateTimeFormat("it-IT", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  }).format(new Date(`${today}T00:00:00Z`));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>BG Manager</h1>
          <p className="text-sm mt-1 first-letter:uppercase" style={{ color: "var(--text-muted)" }}>{todayLong}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RandomPicker />
          <SyncAllButton />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/collection" className="card text-center space-y-1" style={{ textDecoration: "none" }}>
          <Library size={22} className="mx-auto" style={{ color: "var(--accent-blue-light)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalGames}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Giochi</p>
        </Link>
        <Link href="/wishlist" className="card text-center space-y-1" style={{ textDecoration: "none" }}>
          <Heart size={22} className="mx-auto" style={{ color: "var(--accent-red-light)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{wishlistCount}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Wishlist</p>
        </Link>
        <Link href="/statistics" className="card text-center space-y-1" style={{ textDecoration: "none" }}>
          <BarChart3 size={22} className="mx-auto" style={{ color: "var(--text-muted)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>€{totalInvested.toFixed(0)}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Investito</p>
        </Link>
        <Link href="/prestiti" className="card text-center space-y-1" style={{ textDecoration: "none" }}>
          <BookOpen size={22} className="mx-auto"
            style={{ color: loans.length > 0 ? "var(--accent-red-light)" : "var(--text-muted)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{loans.length}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Prestiti attivi</p>
        </Link>
      </div>

      {/* Prestiti: solo se ce ne sono, in cima, perché sono cose da farsi ridare. */}
      {loans.length > 0 && (
        <Section title="Prestiti in corso" href="/prestiti">
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {loans.map((l) => {
              const out = Math.max(0, daysBetween(dayInput(l.loanDate), today));
              return (
                <Link key={l.id} href={`/collection/${l.game.id}`}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0" style={{ textDecoration: "none" }}>
                  <Thumb src={l.game.thumbnail} />
                  <span className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--text-primary)" }}>
                    {l.game.name} <span style={{ color: "var(--text-muted)" }}>· a {l.borrower}</span>
                  </span>
                  <span className="text-xs whitespace-nowrap"
                    style={{ color: out > 30 ? "var(--accent-red-light)" : "var(--text-secondary)" }}>
                    {out === 0 ? "da oggi" : `da ${giorni(out)}`}
                  </span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <PlaysHeatmap days={days} today={today} title="Le tue partite" href="/plays" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Il mai giocato del giorno */}
        <Section title="Il mai giocato del giorno" href="/mai-giocati">
          {!pick ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Hai giocato tutto. Complimenti.</p>
          ) : (
            <Link href={`/collection/${pick.id}`} className="flex gap-4 items-start" style={{ textDecoration: "none" }}>
              {pick.image || pick.thumbnail
                ? <img src={pick.image ?? pick.thumbnail!} alt="" className="w-24 h-24 object-contain rounded-lg flex-shrink-0" />
                : <div className="w-24 h-24 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: "var(--bg-elevated)" }}><Sparkles size={22} style={{ color: "var(--text-muted)" }} /></div>}
              <div className="min-w-0 space-y-1.5">
                <p className="text-base font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{pick.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {pick.minPlayers != null && (
                    <span className="inline-flex items-center gap-1"><Users size={12} />
                      {pick.maxPlayers && pick.maxPlayers !== pick.minPlayers ? `${pick.minPlayers}–${pick.maxPlayers}` : pick.minPlayers}
                    </span>
                  )}
                  {pick.playTime != null && <span className="inline-flex items-center gap-1"><Clock size={12} />{pick.playTime} min</span>}
                  {pick.bggWeight != null && pick.bggWeight > 0 && <span>peso {pick.bggWeight.toFixed(1)}</span>}
                </div>
                {pick.location && (
                  <p className="text-xs inline-flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <MapPin size={12} /> {pick.location.name}
                  </p>
                )}
                {pick.description && (
                  <p className="text-xs leading-relaxed line-clamp-4" style={{ color: "var(--text-secondary)" }}>
                    {pick.description.split("\n")[0]}
                  </p>
                )}
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Uno dei {neverPlayed.length} giochi in casa mai giocati. Cambia ogni giorno.
                </p>
              </div>
            </Link>
          )}
        </Section>

        {/* Ultime partite */}
        <Section title="Ultime partite" href="/plays">
          {recentPlays.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessuna partita ancora.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentPlays.map((p) => {
                const players = parsePlayers(p.players);
                const collId = p.gameId ?? (p.bggGameId ? byBgg.get(p.bggGameId) : undefined);
                const name = (
                  <span className="text-sm font-medium truncate block"
                    style={{ color: collId ? "var(--accent-blue-light)" : "var(--text-primary)" }}>
                    {p.gameName}{p.quantity > 1 && <span style={{ color: "var(--text-muted)" }}> ×{p.quantity}</span>}
                  </span>
                );
                return (
                  <div key={p.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                    <Dices size={14} className="mt-1 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    <div className="flex-1 min-w-0">
                      {collId ? <Link href={`/collection/${collId}`} style={{ textDecoration: "none" }}>{name}</Link> : name}
                      {players.length > 0 && (
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {players.map((x) => `${x.win ? "🏆 " : ""}${x.name}`).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-xs whitespace-nowrap mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {playedLabel(dayInput(p.date), today)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Preordini in arrivo */}
        <Section title="In arrivo" href="/preordini">
          {preorders.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessun preordine aperto.</p>
          ) : (
            <>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {preorders.slice(0, 5).map((g) => {
                  const eta = etaLabel(g.preorderEta ? dayInput(g.preorderEta) : null, today);
                  return (
                    <Link key={g.id} href={`/collection/${g.id}`}
                      className="flex items-center gap-3 py-2 first:pt-0 last:pb-0" style={{ textDecoration: "none" }}>
                      <Thumb src={g.thumbnail} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{g.name}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {g.preorderSource?.name ?? "fonte non indicata"}
                          {!g.preorderPaid && g.cost != null && g.cost > 0 && (
                            <span style={{ color: "var(--accent-red-light)" }}> · da pagare {eur(g.cost)}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs whitespace-nowrap"
                        style={{ color: eta.late ? "var(--accent-red-light)" : "var(--text-secondary)", fontWeight: eta.late ? 600 : 400 }}>
                        {eta.text}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 text-xs border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <span className="inline-flex items-center gap-1.5"><Truck size={13} />
                  {preorders.length > 5 ? `altri ${preorders.length - 5} in arrivo` : `${preorders.length} in arrivo`}
                </span>
                <span>
                  Ancora da pagare{" "}
                  <strong style={{ color: toPay > 0 ? "var(--accent-red-light)" : "var(--text-primary)" }}>{eur(toPay)}</strong>
                </span>
              </div>
            </>
          )}
        </Section>

        {/* Aggiunti di recente */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Aggiunti di recente
            </h2>
            <Link href="/collection/new" className="btn-ghost text-xs flex items-center gap-1"
              style={{ color: "var(--accent-blue-light)" }}>
              <Plus size={12} /> Aggiungi
            </Link>
          </div>
          {recentGames.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessun gioco ancora.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentGames.map((g) => (
                <Link key={g.id} href={`/collection/${g.id}`}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                  style={{ textDecoration: "none" }}>
                  <Thumb src={g.thumbnail} />
                  <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{g.name}</span>
                  <StatusBadge status={g.status} className="text-xs" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
