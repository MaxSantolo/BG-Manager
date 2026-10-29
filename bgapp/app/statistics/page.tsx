import { prisma } from "@/lib/prisma";
import { APP_TZ, formatDayNum, todayInput } from "@/lib/dates";
import { parseStatusConfig, labelFor, OUT_OF_COLLECTION } from "@/lib/status";
import { findNeverPlayed } from "@/lib/neverPlayed";
import StatCards from "./StatCards";
import Charts from "./Charts";
import CostPerPlay from "./CostPerPlay";
import Taste from "./Taste";
import { EXPANSION_TYPE } from "@/lib/expansion";
import { playGameRef, gameIdsByBggId } from "@/lib/playCounts";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const [allGames, wishlistCount, sleeveUsageRaw, settings, plays, neverPlayed] = await Promise.all([
    prisma.game.findMany(),
    prisma.wishlistGame.count(),
    prisma.gameSleeve.groupBy({
      by: ["sleeveId"],
      _sum: { qty: true },
      _count: { gameId: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 10,
    }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { statusConfig: true, collectionStart: true } }),
    prisma.play.findMany({ select: { gameId: true, bggGameId: true, gameName: true, quantity: true } }),
    findNeverPlayed(),
  ]);

  const statusConfig = parseStatusConfig(settings?.statusConfig);

  // Tre insiemi, con le stesse regole delle altre pagine:
  //  - in casa  = la Collezione (esclusi venduti, preordinati, ospite);
  //  - tuoi     = in casa + preordinati (il "Totale giochi", come la dashboard);
  //  - tutto lo storico = anche i venduti, per i conti dei soldi.
  const inHouse    = allGames.filter((g) => !OUT_OF_COLLECTION.includes(g.status));
  const owned      = allGames.filter((g) => g.status !== "Venduto" && g.status !== "GiocatoEsterno");
  const forSale    = allGames.filter((g) => g.status === "InVendita");
  const preordered = allGames.filter((g) => g.status === "Preordinato");
  const sold       = allGames.filter((g) => g.status === "Venduto");
  const bought     = allGames.filter((g) => g.status !== "GiocatoEsterno"); // i giochi da ospite non sono acquisti

  // Soldi: su tutto lo storico.
  const totalInvested    = bought.reduce((s, g) => s + (g.cost ?? 0), 0);
  const withCost         = bought.filter((g) => g.cost);
  const avgCost          = withCost.length > 0 ? totalInvested / withCost.length : 0;
  const collectionValue  = inHouse.reduce((s, g) => s + (g.cost ?? 0), 0);
  const totalSaleRevenue = sold.reduce((s, g) => s + (g.salePrice ?? 0), 0);
  const totalProfit      = totalSaleRevenue - sold.reduce((s, g) => s + (g.cost ?? 0), 0);

  // Collezione: solo i giochi in casa.
  const rated     = inHouse.filter((g) => g.bggRating != null);
  const avgRating = rated.length > 0 ? rated.reduce((s, g) => s + (g.bggRating ?? 0), 0) / rated.length : null;

  // Spesa al giorno = totale speso / giorni dall'inizio della collezione, che si
  // imposta nelle Impostazioni (01/09/2024: gli acquisti senza data, la
  // collezione di partenza, sono "fino a quel giorno"). Nessun gioco viene
  // modificato: la data serve qui, per la spesa al giorno e per mettere quegli
  // acquisti nel grafico per anno. Se un acquisto datato fosse più vecchio, si
  // parte da lì: la media non deve mai cominciare dopo un acquisto vero. Senza
  // data impostata, si parte dal primo acquisto datato (o da oggi).
  const today = todayInput(APP_TZ);
  const datedTimes = bought.filter((g) => g.purchaseDate).map((g) => new Date(g.purchaseDate!).getTime());
  const startTimes = settings?.collectionStart ? [...datedTimes, settings.collectionStart.getTime()] : datedTimes;
  const collectionStart = new Date(startTimes.length ? Math.min(...startTimes) : Date.parse(today));
  // "Oggi" è il giorno di Roma (lib/dates), non l'orologio del server.
  const daysOwned       = Math.max(1, Math.floor((Date.parse(today) - collectionStart.getTime()) / 86_400_000));
  const dailySpend      = totalInvested / daysOwned;

  const playCounts = playCountsByGame(plays, allGames);
  const hIndex = buildHIndex(playCounts);
  const neverIds = new Set(neverPlayed.map((g) => g.id));
  const costPerPlay = buildCostPerPlay(inHouse, playCounts, neverIds);
  const taste = buildTaste(inHouse, neverIds);

  const typeBreakdown = inHouse.reduce(
    (acc, g) => { acc[g.type] = (acc[g.type] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  // Bucket by the CONFIGURED statuses (not the 4 hardcoded built-ins), so
  // GiocatoEsterno and any custom status are counted and the chart reconciles
  // with the total. Anything not in the config lands in "Altri".
  const statusCounts = new Map<string, number>();
  for (const g of allGames) statusCounts.set(g.status, (statusCounts.get(g.status) ?? 0) + 1);
  const byStatus: { key: string; label: string; value: number }[] = [];
  for (const s of statusConfig) {
    const n = statusCounts.get(s.key) ?? 0;
    if (n > 0) byStatus.push({ key: s.key, label: labelFor(statusConfig, s.key), value: n });
    statusCounts.delete(s.key);
  }
  const altri = [...statusCounts.values()].reduce((a, b) => a + b, 0);
  if (altri > 0) byStatus.push({ key: "Altri", label: "Altri", value: altri });

  const years = buildCostByYear(bought, collectionStart);
  const undated = bought.filter((g) => !g.purchaseDate);
  const coverage = {
    startLabel:     formatDayNum(collectionStart),
    undatedCount:   undated.length,
    undatedSpend:   undated.reduce((s, g) => s + (g.cost ?? 0), 0),
    datedSales:     sold.filter((g) => g.saleDate).length,
    totalSales:     sold.length,
  };

  // Top 10 per costo, fra i giochi in casa.
  const topExpensive = inHouse
    .filter((g) => g.cost)
    .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
    .slice(0, 10)
    .map((g) => ({ id: g.id, name: g.name, cost: g.cost ?? 0, type: g.type, status: g.status }));

  // Bustine: chiave per id. Due bustine con lo stesso formato e senza etichetta
  // avevano lo stesso nome a schermo (e la stessa chiave React: righe che
  // sparivano o si duplicavano): le distingue la scorta.
  const sleeveIds = sleeveUsageRaw.map((s) => s.sleeveId);
  const sleeves = sleeveIds.length > 0 ? await prisma.sleeve.findMany({ where: { id: { in: sleeveIds } } }) : [];
  const byId = new Map(sleeves.map((s) => [s.id, s]));
  const baseName = (id: number) => { const s = byId.get(id); return s ? (s.label || s.size) : `#${id}`; };
  const nameCount = new Map<string, number>();
  for (const s of sleeveUsageRaw) nameCount.set(baseName(s.sleeveId), (nameCount.get(baseName(s.sleeveId)) ?? 0) + 1);
  const topSleeves = sleeveUsageRaw.map((s) => {
    const name = baseName(s.sleeveId);
    const stock = byId.get(s.sleeveId)?.quantity;
    return {
      id:    s.sleeveId,
      label: (nameCount.get(name) ?? 0) > 1 && stock != null ? `${name} · scorta ${stock}` : name,
      qty:   s._sum.qty ?? 0,
      games: s._count.gameId,
    };
  });

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Statistiche</h1>

      <StatCards
        collection={{
          total: owned.length,
          inHouse: inHouse.length,
          forSale: forSale.length,
          preordered: preordered.length,
          sold: sold.length,
          wishlist: wishlistCount,
          avgRating: avgRating != null ? round2(avgRating) : null,
          ratedCount: rated.length,
        }}
        plays={{ ...hIndex, neverPlayed: neverPlayed.length }}
        money={{
          totalInvested:    round2(totalInvested),
          avgCost:          round2(avgCost),
          collectionValue:  round2(collectionValue),
          totalSaleRevenue: round2(totalSaleRevenue),
          totalProfit:      round2(totalProfit),
          soldCount:        sold.length,
          dailySpend:       round2(dailySpend),
          daysOwned,
          startDate:        formatDayNum(collectionStart),
        }}
      />

      <CostPerPlay {...costPerPlay} />

      <Taste {...taste} />

      <Charts
        byStatus={byStatus}
        typeBreakdown={typeBreakdown}
        years={years}
        coverage={coverage}
        topExpensive={topExpensive}
        topSleeves={topSleeves}
      />
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * H-index alla BoardGameGeek: il numero H piu' alto per cui esistono almeno H
 * giochi giocati almeno H volte ciascuno. Misura l'ampiezza di una collezione
 * davvero giocata, non quanto e' grande: comprare non lo alza, rigiocare si'.
 *
 * Due dettagli che cambiano il risultato:
 *  - una riga Play puo' valere piu' partite (quantity), ed e' cosi' che le
 *    conta BGG;
 *  - una partita punta al gioco per gameId OPPURE, quando il sync non l'ha
 *    risolto, solo per bggGameId o per nome (30 righe su 337). Contarle come
 *    giochi diversi spezzerebbe in due lo storico di un gioco e abbasserebbe
 *    l'indice, quindi bggGameId viene ricondotto al gioco locale quando esiste.
 */
type PlayRow = { gameId: number | null; bggGameId: number | null; gameName: string; quantity: number };

/** Partite per gioco, con la stessa chiave della pagina Partite (lib/playCounts). */
function playCountsByGame(plays: PlayRow[], games: { id: number; bggId: number | null }[]) {
  const byBgg = gameIdsByBggId(games);
  const countByGame = new Map<string, number>();
  for (const p of plays) {
    const { key } = playGameRef(p, byBgg);
    countByGame.set(key, (countByGame.get(key) ?? 0) + Math.max(1, p.quantity));
  }
  return countByGame;
}

function buildHIndex(countByGame: Map<string, number>) {
  const counts = [...countByGame.values()].sort((a, b) => b - a);
  let h = 0;
  while (h < counts.length && counts[h] >= h + 1) h++;

  // Quanto manca al gradino dopo: per H+1 servono H+1 giochi con H+1 partite.
  const readyForNext = counts.filter((c) => c >= h + 1).length;

  return {
    hIndex: h,
    totalPlays: counts.reduce((a, b) => a + b, 0),
    gamesPlayed: counts.length,
    nextH: h + 1,
    readyForNext,
  };
}

/**
 * Quanto è costata ogni partita: prezzo diviso partite fatte. Solo giochi in
 * casa con un prezzo, e niente espansioni: si giocano dentro il gioco base, qui
 * risulterebbero tutte "mai aperte". I mai giocati sono quelli della pagina Mai
 * giocati (stessa funzione), così i due elenchi non si contraddicono.
 */
function buildCostPerPlay(
  inHouse: { id: number; name: string; type: string; cost: number | null; thumbnail: string | null }[],
  playCounts: Map<string, number>,
  neverIds: Set<number>,
) {
  const paid = inHouse.filter((g) => (g.cost ?? 0) > 0 && g.type !== EXPANSION_TYPE);
  const item = (g: (typeof paid)[number], plays: number) =>
    ({ id: g.id, name: g.name, thumbnail: g.thumbnail, cost: g.cost!, plays, perPlay: plays > 0 ? round2(g.cost! / plays) : null });
  const played = paid.map((g) => item(g, playCounts.get(`g:${g.id}`) ?? 0)).filter((g) => g.plays > 0);
  const unplayed = paid.filter((g) => neverIds.has(g.id)).map((g) => item(g, 0)).sort((a, b) => b.cost - a.cost);
  const playedCost = played.reduce((s, g) => s + g.cost, 0);
  const playedPlays = played.reduce((s, g) => s + g.plays, 0);
  return {
    best:  [...played].sort((a, b) => a.perPlay! - b.perPlay! || b.plays - a.plays).slice(0, 8),
    worst: [...played].sort((a, b) => b.perPlay! - a.perPlay! || b.cost - a.cost).slice(0, 8),
    unplayed: unplayed.slice(0, 8),
    unplayedCount: unplayed.length,
    unplayedSpend: round2(unplayed.reduce((s, g) => s + g.cost, 0)),
    avgPerPlay: playedPlays > 0 ? round2(playedCost / playedPlays) : null,
    playedCount: played.length,
  };
}

/**
 * Il tuo gusto: peso e voto BGG dei giochi in casa (espansioni escluse), giocati
 * o mai giocati come nella pagina Mai giocati, e le meccaniche che ricorrono.
 * Peso o voto 0 per BGG significa "nessun dato": quei giochi stanno fuori dal
 * grafico ma contano nelle meccaniche.
 */
function buildTaste(
  inHouse: { id: number; name: string; type: string; bggWeight: number | null; bggRating: number | null; mechanics: string | null }[],
  neverIds: Set<number>,
) {
  const base = inHouse.filter((g) => g.type !== EXPANSION_TYPE);
  const points = base
    .filter((g) => (g.bggWeight ?? 0) > 0 && (g.bggRating ?? 0) > 0)
    .map((g) => ({ id: g.id, name: g.name, weight: round2(g.bggWeight!), rating: round2(g.bggRating!), played: !neverIds.has(g.id) }));
  const avg = (xs: typeof points, f: (p: (typeof points)[number]) => number) =>
    xs.length ? round2(xs.reduce((s, p) => s + f(p), 0) / xs.length) : null;
  const centre = (xs: typeof points) => ({ count: xs.length, weight: avg(xs, (p) => p.weight), rating: avg(xs, (p) => p.rating) });

  const mech = new Map<string, { games: number; played: number }>();
  for (const g of base) {
    let list: unknown = [];
    try { list = JSON.parse(g.mechanics ?? "[]"); } catch { /* meccaniche illeggibili: nessuna */ }
    if (!Array.isArray(list)) continue;
    for (const m of new Set(list.filter((x): x is string => typeof x === "string"))) {
      const e = mech.get(m) ?? { games: 0, played: 0 };
      e.games++; if (!neverIds.has(g.id)) e.played++;
      mech.set(m, e);
    }
  }
  const mechanics = [...mech].map(([name, e]) => ({ name, ...e }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)).slice(0, 12);

  return {
    points,
    played: centre(points.filter((p) => p.played)),
    unplayed: centre(points.filter((p) => !p.played)),
    mechanics,
    baseCount: base.length,
  };
}

function buildCostByYear(
  games: { status: string; purchaseDate: Date | null; cost: number | null; saleDate: Date | null; salePrice: number | null }[],
  start: Date,
) {
  type Year = { purchased: number; undated: number; sold: number; cost: number; revenue: number };
  const byYear: Record<string, Year> = {};
  const slot = (y: string) => (byYear[y] ??= { purchased: 0, undated: 0, sold: 0, cost: 0, revenue: 0 });
  for (const g of games) {
    // Un acquisto senza data è della collezione di partenza: va all'anno d'inizio.
    const y = String((g.purchaseDate ? new Date(g.purchaseDate) : start).getUTCFullYear());
    slot(y).purchased++;
    if (!g.purchaseDate) slot(y).undated++;
    slot(y).cost += g.cost ?? 0;
    // Una vendita è un gioco VENDUTO con la sua data: una data di vendita rimasta
    // su un gioco ancora in casa (è successo: Algae, Recall) non è una vendita.
    if (g.saleDate && g.status === "Venduto") {
      const sy = String(new Date(g.saleDate).getUTCFullYear());
      slot(sy).sold++;
      slot(sy).revenue += g.salePrice ?? 0;
    }
  }
  // Tutti gli anni dell'intervallo, anche quelli senza movimenti: un anno che
  // manca nel grafico sembra un buco nei dati invece che un anno vuoto.
  const ys = Object.keys(byYear).map(Number);
  if (ys.length === 0) return [];
  const out = [];
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    out.push({ year: String(y), ...(byYear[String(y)] ?? { purchased: 0, undated: 0, sold: 0, cost: 0, revenue: 0 }) });
  }
  return out;
}
