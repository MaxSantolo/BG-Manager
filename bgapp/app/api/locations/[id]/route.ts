import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation, isNotFound } from "@/lib/dupCheck";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });

  try {
    const location = await prisma.location.update({
      where: { id: parseInt(id) },
      data: { name, notes: typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null },
    });
    return NextResponse.json(location);
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ error: "Esiste già una posizione con questo nome" }, { status: 409 });
    if (isNotFound(err)) return NextResponse.json({ error: "Posizione non trovata" }, { status: 404 });
    throw err;
  }
}

/** Deleting a position doesn't touch the games: the FK clears it (ON DELETE SET NULL). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.location.delete({ where: { id: parseInt(id) } });
  } catch (err) {
    if (isNotFound(err)) return NextResponse.json({ error: "Posizione non trovata" }, { status: 404 });
    throw err;
  }
  return NextResponse.json({ ok: true });
}
