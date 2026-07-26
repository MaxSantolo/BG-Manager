import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return NextResponse.json(
    settings ?? { bggUsername: null, bggPassword: null, autoSyncOnStart: true, lastSyncAt: null }
  );
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const autoSyncOnStart = body.autoSyncOnStart;
  const autoSync = typeof autoSyncOnStart === "boolean" ? autoSyncOnStart : undefined;

  // Pasted credentials pick up stray whitespace, and BGG answers that with a
  // bare "Invalid username or password" — trim so it can't happen silently.
  const bggUsername = typeof body.bggUsername === "string" ? body.bggUsername.trim() || null : body.bggUsername;
  const bggPassword = typeof body.bggPassword === "string" ? body.bggPassword.trim() || null : body.bggPassword;

  const settings = await prisma.settings.upsert({
    where:  { id: 1 },
    create: {
      id: 1,
      bggUsername: bggUsername ?? null,
      bggPassword: bggPassword ?? null,
      autoSyncOnStart: autoSync ?? true,
    },
    update: {
      bggUsername: bggUsername ?? null,
      bggPassword: bggPassword ?? null,
      autoSyncOnStart: autoSync,
    },
  });
  return NextResponse.json(settings);
}
