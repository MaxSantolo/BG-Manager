import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: lista tutte le bustine
export async function GET() {
  const sleeves = await prisma.sleeve.findMany({ orderBy: { size: "asc" } });
  return NextResponse.json(sleeves);
}

// POST: aggiungi una nuova bustina
export async function POST(req: NextRequest) {
  const data = await req.json();
  const sleeve = await prisma.sleeve.create({
    data: {
      size: data.size,
      label: data.label,
      quantity: data.quantity ?? 0,
    },
  });
  return NextResponse.json(sleeve, { status: 201 });
}
