import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Rotta stretta per il rinnovo programmato del cookie BGG (job launchd / GitHub
 * Action). Fa esattamente una cosa: sostituire il cookie di sessione salvato.
 * Non è dietro la password dell'app (vedi proxy.ts) e si difende da sola con un
 * bearer token dedicato, così la credenziale che vive in CI vale solo per questa
 * azione invece di dare accesso al database.
 */
const MIN_TOKEN_LENGTH = 32;

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Estrae il valore di un cookie da una stringa "a=1; b=2". */
function cookieValue(cookie: string, name: string): string | null {
  for (const part of cookie.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try { return decodeURIComponent(raw); } catch { return raw; }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const expected = process.env.BGG_COOKIE_TOKEN?.trim();

  // Token assente o troppo corto = rotta non attiva. Si risponde 401 come per un
  // token sbagliato: distinguere i due casi direbbe a un estraneo se e quando
  // vale la pena tentare.
  if (!expected || expected.length < MIN_TOKEN_LENGTH) {
    if (expected) console.warn("[bgg-cookie] BGG_COOKIE_TOKEN troppo corto: rotta disattivata");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided || !tokenMatches(provided, expected))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const cookie = typeof body?.cookie === "string" ? body.cookie.trim() : "";
  if (!cookie || cookie.length > 8192)
    return NextResponse.json({ error: "cookie mancante o troppo lungo" }, { status: 400 });

  const cookieUser = cookieValue(cookie, "bggusername");
  const hasPassword = !!cookieValue(cookie, "bggpassword");
  if (!cookieUser || !hasPassword)
    return NextResponse.json({ error: "cookie privo di bggusername/bggpassword" }, { status: 400 });

  // Il cookie deve essere una sessione DELL'ACCOUNT configurato. Senza questo
  // vincolo, chi arrivasse a scrivere qui potrebbe far pubblicare le partite
  // sull'account di qualcun altro.
  const settings = await prisma.settings.findUnique({
    where: { id: 1 }, select: { bggUsername: true },
  });
  const expectedUser = settings?.bggUsername?.trim();
  if (!expectedUser)
    return NextResponse.json({ error: "nessun username BGG configurato" }, { status: 409 });
  if (cookieUser.toLowerCase() !== expectedUser.toLowerCase())
    return NextResponse.json({ error: "il cookie non appartiene all'account configurato" }, { status: 400 });

  await prisma.settings.update({ where: { id: 1 }, data: { bggCookie: cookie } });
  return NextResponse.json({ ok: true, length: cookie.length });
}
