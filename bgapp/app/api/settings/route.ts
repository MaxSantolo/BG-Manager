import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseStatusConfig } from "@/lib/status";
import { dayInput, parseDayInput } from "@/lib/dates";

type SettingsRow = {
  bggUsername: string | null;
  bggPassword: string | null;
  bggCookie: string | null;
  autoSyncOnStart: boolean;
  lastSyncAt: Date | null;
  statusConfig: string | null;
  collectionStart: Date | null;
};

/**
 * The BGG password is a secret used only server-side (BGG login for writes). It
 * must never leave the server, so responses expose a `hasPassword` boolean
 * instead of the value. `statusConfig` is returned parsed (with defaults).
 */
function publicSettings(s: SettingsRow | null) {
  return {
    bggUsername: s?.bggUsername ?? null,
    hasPassword: !!s?.bggPassword?.trim(),
    hasCookie: !!s?.bggCookie?.trim(),
    autoSyncOnStart: s?.autoSyncOnStart ?? true,
    lastSyncAt: s?.lastSyncAt ?? null,
    statusConfig: parseStatusConfig(s?.statusConfig),
    collectionStart: s?.collectionStart ? dayInput(s.collectionStart) : null,
  };
}

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return NextResponse.json(publicSettings(settings));
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const autoSync = typeof body.autoSyncOnStart === "boolean" ? body.autoSyncOnStart : undefined;

  const bggUsername = typeof body.bggUsername === "string" ? body.bggUsername.trim() || null : undefined;

  // Password semantics: it's write-only from the client's perspective.
  //  - a non-empty string  → set it (trimmed; stray whitespace breaks BGG login)
  //  - clearBggPassword:true → remove it
  //  - omitted / empty      → LEAVE UNCHANGED (never wipe on a partial save)
  let bggPassword: string | null | undefined = undefined;
  if (body.clearBggPassword === true) bggPassword = null;
  else if (typeof body.bggPassword === "string" && body.bggPassword.trim()) bggPassword = body.bggPassword.trim();

  // Same write-only semantics for the pasted session cookie.
  let bggCookie: string | null | undefined = undefined;
  if (body.clearBggCookie === true) bggCookie = null;
  else if (typeof body.bggCookie === "string" && body.bggCookie.trim()) bggCookie = body.bggCookie.trim();

  // Status config: sanitised through parseStatusConfig (which heals bad shapes
  // and guarantees the built-in keys survive), then stored as JSON. Omitted =
  // leave unchanged.
  const statusConfig = Array.isArray(body.statusConfig)
    ? JSON.stringify(parseStatusConfig(JSON.stringify(body.statusConfig)))
    : undefined;

  // Inizio collezione: "AAAA-MM-GG" (giorno a mezzanotte UTC), "" = togli,
  // assente = non toccare.
  let collectionStart: Date | null | undefined = undefined;
  if ("collectionStart" in body) {
    const v = typeof body.collectionStart === "string" ? body.collectionStart.trim() : "";
    const d = v ? parseDayInput(v, 1970) : null;
    if (v && !d) return NextResponse.json({ error: "Data di inizio non valida" }, { status: 400 });
    collectionStart = d;
  }

  const settings = await prisma.settings.upsert({
    where:  { id: 1 },
    create: {
      id: 1,
      bggUsername: bggUsername ?? null,
      bggPassword: bggPassword ?? null,
      bggCookie: bggCookie ?? null,
      autoSyncOnStart: autoSync ?? true,
      statusConfig: statusConfig ?? null,
      collectionStart: collectionStart ?? null,
    },
    update: {
      // undefined tells Prisma to leave the column untouched.
      bggUsername,
      bggPassword,
      bggCookie,
      autoSyncOnStart: autoSync,
      statusConfig,
      collectionStart,
    },
  });
  return NextResponse.json(publicSettings(settings));
}
