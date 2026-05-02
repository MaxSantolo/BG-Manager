import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sleeve = await prisma.sleeve.findUnique({ where: { id: Number(id) } });
  if (!sleeve) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sleeve);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const sleeve = await prisma.sleeve.update({
    where: { id: Number(id) },
    data: {
      size: data.size,
      label: data.label,
      quantity: data.quantity,
    },
  });
  return NextResponse.json(sleeve);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.sleeve.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
