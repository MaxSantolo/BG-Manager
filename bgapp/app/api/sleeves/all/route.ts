import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET tutte le bustine disponibili
export async function GET() {
  const sleeves = await prisma.sleeve.findMany({ orderBy: { size: "asc" } });
  return NextResponse.json(sleeves);
}
