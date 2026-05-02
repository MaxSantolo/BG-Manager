import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { delta } = await req.json();
  const n = parseInt(delta);
  if (!Number.isFinite(n) || n === 0) {
    return NextResponse.json({ error: "delta non valido" }, { status: 400 });
  }
  const sleeve = await prisma.sleeve.update({
    where: { id: parseInt(id) },
    data: { quantity: { increment: n } },
  });
  return NextResponse.json(sleeve);
}
