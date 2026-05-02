import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const loan = await prisma.loan.create({
    data: {
      gameId:   body.gameId,
      borrower: body.borrower,
      loanDate: body.loanDate ? new Date(body.loanDate) : new Date(),
      notes:    body.notes ?? null,
    },
  });
  return NextResponse.json(loan, { status: 201 });
}

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("gameId");
  const active = req.nextUrl.searchParams.get("active");
  const loans = await prisma.loan.findMany({
    where: {
      ...(gameId ? { gameId: parseInt(gameId) } : {}),
      ...(active === "true" ? { returned: false } : {}),
    },
    include: { game: { select: { id: true, name: true, thumbnail: true } } },
    orderBy: { loanDate: "desc" },
  });
  return NextResponse.json(loans);
}
