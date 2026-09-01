import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const gameId = Number(body.gameId);
  const borrower = typeof body.borrower === "string" ? body.borrower.trim() : "";
  if (!Number.isInteger(gameId) || !borrower)
    return NextResponse.json({ error: "gameId e borrower sono obbligatori" }, { status: 400 });

  const loan = await prisma.loan.create({
    data: {
      gameId,
      borrower,
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
