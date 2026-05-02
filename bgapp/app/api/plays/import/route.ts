import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bggLogin } from "@/lib/bggAuth";

interface BggPlay {
  bggPlayId: number;
  date: string;
  quantity: number;
  duration: number | null;
  location: string | null;
  notes: string | null;
  incomplete: boolean;
  gameName: string;
  bggGameId: number | null;
  players: { name: string; username: string; score: string; win: boolean; color: string }[];
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&apos;/g, "'");
}

function parsePlaysXml(xml: string): { total: number; plays: BggPlay[] } {
  const totalMatch = xml.match(/\btotal="(\d+)"/);
  const total = totalMatch ? parseInt(totalMatch[1]) : 0;
  const plays: BggPlay[] = [];

  const playRegex = /<play\s((?:[^>"]|"[^"]*")*?)>([\s\S]*?)<\/play>/g;
  let m: RegExpExecArray | null;

  while ((m = playRegex.exec(xml)) !== null) {
    const attrs = m[1], body = m[2];
    const id = parseInt(attrs.match(/\bid="(\d+)"/)?.[1] ?? "0");
    if (!id) continue;

    const itemMatch = body.match(/<item\s[^>]*\bname="([^"]+)"[^>]*\bobjectid="(\d+)"/);
    const gameName  = itemMatch ? decodeHtml(itemMatch[1]) : "";
    const bggGameId = itemMatch ? parseInt(itemMatch[2]) || null : null;
    const notes     = body.match(/<comments>([\s\S]*?)<\/comments>/)?.[1]?.trim() || null;

    const players: BggPlay["players"] = [];
    const playerRegex = /<player\s((?:[^>"]|"[^"]*")*?)(?:\/>|>)/g;
    let pm: RegExpExecArray | null;
    while ((pm = playerRegex.exec(body)) !== null) {
      const pa = pm[1];
      const name = pa.match(/\bname="([^"]*)"/)?.[1] ?? "";
      if (name) players.push({
        name, username: pa.match(/\busername="([^"]*)"/)?.[1] ?? "",
        score: pa.match(/\bscore="([^"]*)"/)?.[1] ?? "",
        win: /\bwin="1"/.test(pa), color: pa.match(/\bcolor="([^"]*)"/)?.[1] ?? "",
      });
    }

    plays.push({
      bggPlayId: id, date: attrs.match(/\bdate="([^"]+)"/)?.[1] ?? "",
      quantity: parseInt(attrs.match(/\bquantity="(\d+)"/)?.[1] ?? "1") || 1,
      duration: parseInt(attrs.match(/\blength="(\d+)"/)?.[1] ?? "0") || null,
      location: attrs.match(/\blocation="([^"]*)"/)?.[1] || null,
      incomplete: /\bincomplete="1"/.test(attrs),
      gameName, bggGameId, notes, players,
    });
  }
  return { total, plays };
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username?.trim()) return NextResponse.json({ error: "Username richiesto" }, { status: 400 });
  if (!password?.trim()) return NextResponse.json({ error: "Password richiesta" }, { status: 400 });

  let cookie: string;
  try {
    cookie = await bggLogin(username.trim(), password);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore login" }, { status: 401 });
  }

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  async function fetchPage(page: number): Promise<{ total: number; plays: BggPlay[] } | { error: string; status: number }> {
    const url = `https://boardgamegeek.com/xmlapi2/plays?username=${encodeURIComponent(username.trim())}&page=${page}`;
    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await fetch(url, { cache: "no-store", headers: { Cookie: cookie } });
      if (res.status === 202) { await sleep(2000 + attempt * 1000); continue; }
      if (!res.ok) return { error: `BGG API error ${res.status}`, status: 502 };
      return parsePlaysXml(await res.text());
    }
    return { error: "BGG ha continuato a rispondere 202 dopo vari tentativi.", status: 504 };
  }

  const allPlays: BggPlay[] = [];
  let page = 1, total = Infinity;

  while (allPlays.length < total && page <= 100) {
    const parsed = await fetchPage(page);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    total = parsed.total;
    if (parsed.plays.length === 0) break;
    allPlays.push(...parsed.plays);
    page++;
  }

  const games = await prisma.game.findMany({ select: { id: true, bggId: true } });
  const gamesByBggId = new Map(games.filter(g => g.bggId).map(g => [g.bggId!, g.id]));

  let imported = 0;
  for (const play of allPlays) {
    if (!play.bggPlayId || !play.date) continue;
    const gameId = play.bggGameId ? (gamesByBggId.get(play.bggGameId) ?? null) : null;

    // Authoritative from BGG (always overwrite)
    const authoritative = {
      date: new Date(play.date),
      quantity: play.quantity,
      incomplete: play.incomplete,
      gameName: play.gameName,
      bggGameId: play.bggGameId,
      gameId,
    };
    // Optional from BGG: overwrite only if BGG actually provides them.
    // Otherwise keep whatever the user has locally (Prisma skips undefined).
    const optional = {
      duration: play.duration ?? undefined,
      location: play.location ?? undefined,
      notes:    play.notes    ?? undefined,
      players:  play.players.length ? JSON.stringify(play.players) : undefined,
    };

    await prisma.play.upsert({
      where: { bggPlayId: play.bggPlayId },
      create: {
        bggPlayId: play.bggPlayId,
        ...authoritative,
        duration: play.duration,
        location: play.location,
        notes:    play.notes,
        players:  play.players.length ? JSON.stringify(play.players) : null,
      },
      update: { ...authoritative, ...optional },
    });
    imported++;
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, bggUsername: username.trim() },
    update: { bggUsername: username.trim() },
  });

  return NextResponse.json({ imported, total: allPlays.length });
}
