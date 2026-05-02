import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const type   = searchParams.get("type")   ?? "";

  const where = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(status ? { status } : {}),
    ...(type   ? { type }   : {}),
  };

  const games = await prisma.game.findMany({
    where,
    orderBy: { name: "asc" },
    include: { gameSleeves: { include: { sleeve: true } } },
  });

  const header = [
    "Nome", "Tipo", "Stato", "Costo", "Prezzo vendita",
    "Data acquisto", "Data vendita", "Inserto", "Bustine",
    "Rating BGG", "Peso BGG", "Giocatori", "Durata", "Anno", "Note",
  ];

  const rows = games.map((g) => [
    g.name,
    g.type,
    g.status,
    g.cost?.toFixed(2) ?? "",
    g.salePrice?.toFixed(2) ?? "",
    g.purchaseDate ? new Date(g.purchaseDate).toLocaleDateString("it-IT") : "",
    g.saleDate ? new Date(g.saleDate).toLocaleDateString("it-IT") : "",
    g.insert,
    g.gameSleeves.map((gs) => `${gs.sleeve.label || gs.sleeve.size} x${gs.qty}`).join(" | "),
    g.bggRating?.toFixed(1) ?? "",
    g.bggWeight?.toFixed(1) ?? "",
    g.minPlayers && g.maxPlayers ? `${g.minPlayers}-${g.maxPlayers}` : "",
    g.playTime?.toString() ?? "",
    g.yearPublished?.toString() ?? "",
    (g.notes ?? "").replace(/\n/g, " "),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="collezione-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
