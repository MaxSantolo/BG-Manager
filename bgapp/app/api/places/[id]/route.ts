import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Renaming a place also rewrites the plays that referenced it, so the registry
 * and the play history can't drift apart. BGG keeps the old string until those
 * plays are edited — location is free text there, not an entity.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name } = body;
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });

  const current = await prisma.place.findUnique({ where: { id: parseInt(id) } });
  if (!current) return NextResponse.json({ error: "Luogo non trovato" }, { status: 404 });

  if (cleanName !== current.name) {
    const clash = await prisma.place.findUnique({ where: { name: cleanName } });
    if (clash) return NextResponse.json({ error: `"${cleanName}" esiste già` }, { status: 409 });

    await prisma.play.updateMany({
      where: { location: current.name },
      data:  { location: cleanName },
    });
  }

  // Optional manual image (empty string clears it); places have no BGG source.
  const imageUrl = typeof body.imageUrl === "string" ? (body.imageUrl.trim() || null) : undefined;

  const place = await prisma.place.update({
    where: { id: parseInt(id) },
    data:  { name: cleanName, imageUrl },
  });
  return NextResponse.json(place);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Only drops it from the picker; plays keep whatever location they recorded.
  await prisma.place.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
