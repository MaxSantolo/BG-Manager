import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const loan = await prisma.loan.update({
    where: { id: parseInt(id) },
    data: {
      returned:   body.returned   ?? undefined,
      returnDate: body.returned   ? new Date() : undefined,
      notes:      body.notes      ?? undefined,
      borrower:   body.borrower   ?? undefined,
    },
  });
  return NextResponse.json(loan);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.loan.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
