import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Most-used first — your usual table should be one tap away. */
export async function GET() {
  const places = await prisma.place.findMany({
    orderBy: [{ playCount: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ places });
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName) return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });

  const place = await prisma.place.upsert({
    where:  { name: cleanName },
    create: { name: cleanName },
    update: {},
  });
  return NextResponse.json(place, { status: 201 });
}
