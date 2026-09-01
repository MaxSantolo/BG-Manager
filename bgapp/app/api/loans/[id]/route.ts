import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNotFound } from "@/lib/dupCheck";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  try {
    const loan = await prisma.loan.update({
      where: { id: parseInt(id) },
      data: {
        returned:   body.returned ?? undefined,
        // Set the return date when marking returned, CLEAR it when un-returning,
        // leave it untouched when `returned` isn't part of the update.
        returnDate: body.returned === true ? new Date() : body.returned === false ? null : undefined,
        notes:      body.notes ?? undefined,
        borrower:   body.borrower ?? undefined,
      },
    });
    return NextResponse.json(loan);
  } catch (err) {
    if (isNotFound(err)) return NextResponse.json({ error: "Prestito non trovato" }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.loan.delete({ where: { id: parseInt(id) } });
  } catch (err) {
    if (isNotFound(err)) return NextResponse.json({ error: "Prestito non trovato" }, { status: 404 });
    throw err;
  }
  return NextResponse.json({ ok: true });
}
