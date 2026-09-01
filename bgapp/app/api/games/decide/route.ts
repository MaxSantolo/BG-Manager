import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

/**
 * Candidate games for "what do we play tonight". Returns the whole matching
 * set rather than one pick, so the client can show the shortlist and draw from
 * it without another round-trip.
 *
 * Weight and play time are only known for part of the collection, so games
 * missing the field being filtered on are reported separately instead of
 * silently vanishing.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const players    = parseInt(searchParams.get("players") ?? "") || null;
  const minWeight  = parseFloat(searchParams.get("minWeight") ?? "") || null;
  const maxWeight  = parseFloat(searchParams.get("maxWeight") ?? "") || null;
  const maxTime    = parseInt(searchParams.get("maxTime") ?? "") || null;
  const minTime    = parseInt(searchParams.get("minTime") ?? "") || null;
  const withExpansions = searchParams.get("expansions") === "1";
  const sort       = searchParams.get("sort") ?? "rating";

  const where: Prisma.GameWhereInput = {
    status: "InCollezione",
    ...(withExpansions ? {} : { type: { not: "Espansione" } }),
    ...(players ? { minPlayers: { lte: players }, maxPlayers: { gte: players } } : {}),
    ...(minWeight || maxWeight
      ? { bggWeight: { ...(minWeight ? { gte: minWeight } : {}), ...(maxWeight ? { lte: maxWeight } : {}) } }
      : {}),
    ...(minTime || maxTime
      ? { playTime: { ...(minTime ? { gte: minTime } : {}), ...(maxTime ? { lte: maxTime } : {}) } }
      : {}),
  };

  const orderBy: Prisma.GameOrderByWithRelationInput =
    sort === "weight"   ? { bggWeight: "desc" }
    : sort === "time"   ? { playTime: "asc" }
    : sort === "name"   ? { name: "asc" }
    : { bggRating: "desc" };

  const games = await prisma.game.findMany({
    where,
    orderBy,
    select: {
      id: true, name: true, thumbnail: true, bggId: true,
      bggRating: true, bggWeight: true, minPlayers: true, maxPlayers: true,
      playTime: true, yearPublished: true, type: true,
    },
  });

  // How many candidates the filters had to drop for want of data.
  const baseWhere: Prisma.GameWhereInput = {
    status: "InCollezione",
    ...(withExpansions ? {} : { type: { not: "Espansione" } }),
    ...(players ? { minPlayers: { lte: players }, maxPlayers: { gte: players } } : {}),
  };
  const [weightUnknown, timeUnknown, playersUnknown] = await Promise.all([
    minWeight || maxWeight
      ? prisma.game.count({ where: { ...baseWhere, bggWeight: null } })
      : Promise.resolve(0),
    minTime || maxTime
      ? prisma.game.count({ where: { ...baseWhere, playTime: null } })
      : Promise.resolve(0),
    players
      ? prisma.game.count({
          where: {
            status: "InCollezione",
            ...(withExpansions ? {} : { type: { not: "Espansione" } }),
            OR: [{ minPlayers: null }, { maxPlayers: null }],
          },
        })
      : Promise.resolve(0),
  ]);
  const unknown = { weight: weightUnknown, time: timeUnknown, players: playersUnknown };

  return NextResponse.json({ games, total: games.length, unknown });
}
