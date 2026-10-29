import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation, isNotFound } from "@/lib/dupCheck";

/** Rinomina una provenienza (Rubrica). Un nome già usato è un 409. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "Nome troppo lungo" }, { status: 400 });

  try {
    const source = await prisma.preorderSource.update({ where: { id: parseInt(id) }, data: { name } });
    return NextResponse.json({ id: source.id, name: source.name });
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ error: "Esiste già una provenienza con questo nome" }, { status: 409 });
    if (isNotFound(err)) return NextResponse.json({ error: "Provenienza non trovata" }, { status: 404 });
    throw err;
  }
}

/** Eliminarla non tocca i giochi: la FK svuota il campo (ON DELETE SET NULL). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.preorderSource.delete({ where: { id: parseInt(id) } });
  } catch (err) {
    if (isNotFound(err)) return NextResponse.json({ error: "Provenienza non trovata" }, { status: 404 });
    throw err;
  }
  return NextResponse.json({ ok: true });
}
