import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings ?? { bggUsername: null, bggPassword: null });
}

export async function PUT(req: NextRequest) {
  const { bggUsername, bggPassword } = await req.json();
  const settings = await prisma.settings.upsert({
    where:  { id: 1 },
    create: { id: 1, bggUsername: bggUsername ?? null, bggPassword: bggPassword ?? null },
    update: { bggUsername: bggUsername ?? null, bggPassword: bggPassword ?? null },
  });
  return NextResponse.json(settings);
}
