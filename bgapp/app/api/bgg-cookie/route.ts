import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Narrow endpoint for the scheduled cookie refresher (GitHub Action): it can do
 * exactly one thing — replace the stored BGG session cookie. It is deliberately
 * NOT behind the app password (see proxy.ts) and guards itself with a dedicated
 * bearer token, so the only credential the CI job holds grants this one action
 * instead of database access.
 */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const expected = process.env.BGG_COOKIE_TOKEN?.trim();
  if (!expected) return NextResponse.json({ error: "endpoint non configurato" }, { status: 503 });

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided || !tokenMatches(provided, expected))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const cookie = typeof body?.cookie === "string" ? body.cookie.trim() : "";
  // Refuse anything that isn't an actual authenticated BGG session, so a broken
  // refresh can't silently wipe a working cookie.
  if (!cookie.includes("bggusername=") || !cookie.includes("bggpassword="))
    return NextResponse.json({ error: "cookie privo di bggusername/bggpassword" }, { status: 400 });

  await prisma.settings.upsert({
    where:  { id: 1 },
    update: { bggCookie: cookie },
    create: { id: 1, bggCookie: cookie },
  });
  return NextResponse.json({ ok: true, length: cookie.length });
}
