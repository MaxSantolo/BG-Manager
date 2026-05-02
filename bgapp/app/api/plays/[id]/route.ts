import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { date, quantity, duration, location, notes, incomplete, gameName, players } = body;

  const play = await prisma.play.update({
    where: { id: parseInt(id) },
    data: {
      date:       new Date(date),
      quantity:   quantity ?? 1,
      duration:   duration ?? null,
      location:   location ?? null,
      notes:      notes ?? null,
      incomplete: incomplete ?? false,
      gameName,
      players:    players?.length ? JSON.stringify(players) : null,
    },
  });
  return NextResponse.json(play);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.play.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
