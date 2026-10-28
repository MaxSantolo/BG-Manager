import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Provenienze dei preordini (Kickstarter, Gamefound, negozi…). Si creano al volo dal selettore. */
export async function GET() {
  const sources = await prisma.preorderSource.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { games: true } } },
  });
  return NextResponse.json({
    sources: sources.map((s) => ({ id: s.id, name: s.name, gameCount: s._count.games })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "Nome troppo lungo" }, { status: 400 });

  // Nome già presente: si riusa, "crea" e "scegli quella che c'è" sono la stessa
  // intenzione. Controllo PRIMA di creare: con l'adapter Neon HTTP l'errore di
  // unicità non arriva come P2002, quindi intercettarlo nel catch non funziona.
  const existing = await prisma.preorderSource.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ id: existing.id, name: existing.name });

  const source = await prisma.preorderSource.create({ data: { name } });
  return NextResponse.json({ id: source.id, name: source.name }, { status: 201 });
}
