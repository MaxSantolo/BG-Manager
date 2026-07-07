export interface BggSearchResult {
  id: number;
  name: string;
  yearPublished?: number;
}

export interface BggGameDetail {
  id: number;
  name: string;
  yearPublished?: number;
  description?: string;
  thumbnail?: string;
  image?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playTime?: number;
  minAge?: number;
  bggRating?: number;
  bggWeight?: number;
  designers?: string[];
  categories?: string[];
  mechanics?: string[];
}

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";
const BGG_TOKEN = process.env.BGG_API_KEY ?? "7a5e3d1c-353b-4afc-a49f-eec8173b92bd";
const bggHeaders = { Authorization: `Bearer ${BGG_TOKEN}` };

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchBgg(query: string): Promise<BggSearchResult[]> {
  const url = `${BGG_BASE}/search?query=${encodeURIComponent(query)}&type=boardgame,boardgameexpansion`;
  const res = await fetch(url, { headers: bggHeaders, next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const xml = await res.text();
  const results: BggSearchResult[] = [];

  const itemMatches = xml.matchAll(/<item type="boardgame[^"]*" id="(\d+)">([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const id = parseInt(match[1]);
    const inner = match[2];
    const nameMatch = inner.match(/<name type="primary"[^/]*value="([^"]+)"/);
    const yearMatch = inner.match(/<yearpublished value="(\d+)"/);
    if (nameMatch) {
      results.push({
        id,
        name: decodeXmlEntities(nameMatch[1]),
        yearPublished: yearMatch ? parseInt(yearMatch[1]) : undefined,
      });
    }
  }
  return results.slice(0, 20);
}

// ── Game detail ───────────────────────────────────────────────────────────────

export async function getBggGame(id: number): Promise<BggGameDetail | null> {
  const url = `${BGG_BASE}/thing?id=${id}&stats=1`;
  const res = await fetch(url, { headers: bggHeaders, next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const xml = await res.text();

  const nameMatch = xml.match(/<name type="primary"[^/]*value="([^"]+)"/);
  if (!nameMatch) return null;

  const yearMatch   = xml.match(/<yearpublished value="(\d+)"/);
  const thumbMatch  = xml.match(/<thumbnail>([\s\S]*?)<\/thumbnail>/);
  const imageMatch  = xml.match(/<image>([\s\S]*?)<\/image>/);
  const minPMatch   = xml.match(/<minplayers value="(\d+)"/);
  const maxPMatch   = xml.match(/<maxplayers value="(\d+)"/);
  const timeMatch   = xml.match(/<maxplaytime value="(\d+)"/);
  const ratingMatch = xml.match(/<average value="([0-9.]+)"/);
  const weightMatch = xml.match(/<averageweight value="([0-9.]+)"/);
  const descMatch   = xml.match(/<description>([\s\S]*?)<\/description>/);

  const designers: string[] = [];
  for (const m of xml.matchAll(/<link type="boardgamedesigner"[^/]*value="([^"]+)"/g)) {
    designers.push(decodeXmlEntities(m[1]));
  }

  const categories: string[] = [];
  for (const m of xml.matchAll(/<link type="boardgamecategory"[^/]*value="([^"]+)"/g)) {
    categories.push(decodeXmlEntities(m[1]));
  }

  const mechanics: string[] = [];
  for (const m of xml.matchAll(/<link type="boardgamemechanic"[^/]*value="([^"]+)"/g)) {
    mechanics.push(decodeXmlEntities(m[1]));
  }

  const rawDesc = descMatch?.[1]?.trim() ?? "";
  const description = rawDesc
    ? decodeXmlEntities(rawDesc).replace(/<[^>]+>/g, "").trim()
    : undefined;

  return {
    id,
    name: decodeXmlEntities(nameMatch[1]),
    yearPublished: yearMatch ? parseInt(yearMatch[1]) : undefined,
    thumbnail: thumbMatch?.[1]?.trim() || undefined,
    image: imageMatch?.[1]?.trim() || undefined,
    minPlayers: minPMatch ? parseInt(minPMatch[1]) : undefined,
    maxPlayers: maxPMatch ? parseInt(maxPMatch[1]) : undefined,
    playTime: timeMatch ? parseInt(timeMatch[1]) : undefined,
    bggRating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
    bggWeight: weightMatch ? parseFloat(weightMatch[1]) : undefined,
    description,
    designers,
    categories,
    mechanics,
  };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
