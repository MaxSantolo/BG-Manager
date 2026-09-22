import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/dupCheck";

/** Physical positions (shelf, cupboard, box). Created on the fly from the game form. */
export async function GET() {
  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { games: true } } },
  });
  return NextResponse.json({
    locations: locations.map((l) => ({ id: l.id, name: l.name, notes: l.notes, gameCount: l._count.games })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "Nome troppo lungo" }, { status: 400 });

  try {
    const location = await prisma.location.create({
      data: { name, notes: typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null },
    });
    return NextResponse.json({ id: location.id, name: location.name, notes: location.notes, gameCount: 0 }, { status: 201 });
  } catch (err) {
    // Same name already there: reuse it instead of failing — the form treats
    // "create" and "pick the existing one" as the same intent.
    if (isUniqueViolation(err)) {
      const existing = await prisma.location.findUnique({ where: { name } });
      if (existing) return NextResponse.json({ id: existing.id, name: existing.name, notes: existing.notes }, { status: 200 });
    }
    throw err;
  }
}
