import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bggLogin } from "@/lib/bggAuth";

interface BggCollectionGame {
  bggId: number;
  name: string;
  subtype: string;
  yearPublished: number | null;
  thumbnail: string | null;
  image: string | null;
  bggRating: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTime: number | null;
}

function decodeHtml(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#039;/g, "'");
}

function fixUrl(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("//") ? `https:${url}` : url;
}

function subtypeToType(subtype: string): string {
  if (subtype === "boardgameexpansion") return "Espansione";
  if (subtype === "boardgameaccessory")  return "Accessorio";
  return "Base";
}

function parseCollectionXml(xml: string): BggCollectionGame[] {
  const games: BggCollectionGame[] = [];
  const itemRegex = /<item\s((?:[^>"]|"[^"]*")*?)>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRegex.exec(xml)) !== null) {
    const attrs = m[1], body = m[2];

    const objecttype = attrs.match(/\bobjecttype="([^"]+)"/)?.[1];
    if (objecttype !== "thing") continue;

    const bggId   = parseInt(attrs.match(/\bobjectid="(\d+)"/)?.[1] ?? "0");
    const subtype = attrs.match(/\bsubtype="([^"]+)"/)?.[1] ?? "boardgame";
    if (!bggId) continue;

    const name          = decodeHtml(body.match(/<name[^>]*sortindex[^>]*>([^<]+)<\/name>/)?.[1]?.trim() ?? "");
    if (!name) continue;

    const yearPublished = parseInt(body.match(/<yearpublished>(\d+)<\/yearpublished>/)?.[1] ?? "0") || null;
    const thumbnail     = fixUrl(body.match(/<thumbnail>\s*([^<\s]+)\s*<\/thumbnail>/)?.[1] ?? null);
    const image         = fixUrl(body.match(/<image>\s*([^<\s]+)\s*<\/image>/)?.[1] ?? null);

    const statsAttrs    = body.match(/<stats\s([^>]*?)>/)?.[1] ?? "";
    const minPlayers    = parseInt(statsAttrs.match(/\bminplayers="(\d+)"/)?.[1] ?? "0") || null;
    const maxPlayers    = parseInt(statsAttrs.match(/\bmaxplayers="(\d+)"/)?.[1] ?? "0") || null;
    const playTime      = parseInt(statsAttrs.match(/\bplayingtime="(\d+)"/)?.[1] ?? "0") || null;
    const bggRating     = parseFloat(body.match(/<average\s+value="([^"]+)"/)?.[1] ?? "0") || null;

    games.push({ bggId, name, subtype, yearPublished, thumbnail, image, bggRating, minPlayers, maxPlayers, playTime });
  }

  return games;
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username?.trim() || !password?.trim())
    return NextResponse.json({ error: "Username e password richiesti" }, { status: 400 });

  let cookie: string;
  try { cookie = await bggLogin(username.trim(), password); }
  catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore login" }, { status: 401 });
  }

  // BGG collection can return 202 — retry inline with backoff
  let xml = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username.trim())}&own=1&stats=1`,
      { cache: "no-store", headers: { Cookie: cookie } }
    );
    if (res.status === 202) {
      await new Promise(r => setTimeout(r, 2000 + attempt * 1000));
      continue;
    }
    if (!res.ok) return NextResponse.json({ error: `BGG API error ${res.status}` }, { status: 502 });
    xml = await res.text();
    break;
  }
  if (!xml) return NextResponse.json({ error: "BGG ha continuato a rispondere 202 dopo vari tentativi." }, { status: 504 });

  const bggGames = parseCollectionXml(xml);

  // Load existing games by bggId so we can fill in missing fields without overwriting
  const existing = await prisma.game.findMany({
    where: { bggId: { in: bggGames.map(g => g.bggId) } },
    select: {
      id: true, bggId: true,
      thumbnail: true, image: true, bggRating: true,
      minPlayers: true, maxPlayers: true, playTime: true, yearPublished: true,
    },
  });
  const existingByBgg = new Map(existing.map(g => [g.bggId!, g]));

  let imported = 0, enriched = 0;
  for (const g of bggGames) {
    const local = existingByBgg.get(g.bggId);
    if (local) {
      // Fill only locally-missing fields; never touch name/type/status/cost/etc.
      const patch: Record<string, unknown> = {};
      if (local.thumbnail == null && g.thumbnail != null) patch.thumbnail = g.thumbnail;
      if (local.image == null && g.image != null) patch.image = g.image;
      if (local.bggRating == null && g.bggRating != null) patch.bggRating = g.bggRating;
      if (local.minPlayers == null && g.minPlayers != null) patch.minPlayers = g.minPlayers;
      if (local.maxPlayers == null && g.maxPlayers != null) patch.maxPlayers = g.maxPlayers;
      if (local.playTime == null && g.playTime != null) patch.playTime = g.playTime;
      if (local.yearPublished == null && g.yearPublished != null) patch.yearPublished = g.yearPublished;
      if (Object.keys(patch).length > 0) {
        await prisma.game.update({ where: { id: local.id }, data: patch });
        enriched++;
      }
      continue;
    }
    await prisma.game.create({
      data: {
        bggId:        g.bggId,
        name:         g.name,
        type:         subtypeToType(g.subtype),
        status:       "InCollezione",
        thumbnail:    g.thumbnail,
        image:        g.image,
        bggRating:    g.bggRating,
        minPlayers:   g.minPlayers,
        maxPlayers:   g.maxPlayers,
        playTime:     g.playTime,
        yearPublished: g.yearPublished,
        designers:    "[]",
        mechanics:    "[]",
      },
    });
    imported++;
  }

  return NextResponse.json({ imported, enriched, total: bggGames.length });
}
