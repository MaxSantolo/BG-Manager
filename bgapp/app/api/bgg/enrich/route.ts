import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBggGame } from "@/lib/bgg";

export const maxDuration = 60;

export async function POST() {
  // Enrich each game with a bggId exactly once: bggEnrichedAt marks "already
  // fetched from BGG". Filtering on missing fields instead would re-fetch games
  // that legitimately have no description/designers on BGG forever, never
  // converging and burning API calls every run.
  const games = await prisma.game.findMany({
    where: { bggId: { not: null }, bggEnrichedAt: null },
    select: { id: true, bggId: true },
    take: 50, // Process max 50 per call to stay within timeout
  });

  let enriched = 0;
  let failed = 0;

  for (const game of games) {
    try {
      const detail = await getBggGame(game.bggId!);
      if (!detail) { failed++; continue; }

      await prisma.game.update({
        where: { id: game.id },
        data: {
          thumbnail:    detail.thumbnail    || undefined,
          image:        detail.image        || undefined,
          description:  detail.description  || undefined,
          designers:    detail.designers?.length ? JSON.stringify(detail.designers) : undefined,
          mechanics:    detail.mechanics?.length ? JSON.stringify(detail.mechanics) : undefined,
          bggRating:    detail.bggRating    ?? undefined,
          bggWeight:    detail.bggWeight    ?? undefined,
          minPlayers:   detail.minPlayers   ?? undefined,
          maxPlayers:   detail.maxPlayers   ?? undefined,
          playTime:     detail.playTime     ?? undefined,
          yearPublished: detail.yearPublished ?? undefined,
          bggEnrichedAt: new Date(),
        },
      });
      enriched++;

      // Small delay to be respectful to BGG API rate limits
      await new Promise(r => setTimeout(r, 200));
    } catch {
      failed++;
    }
  }

  // Also enrich wishlist
  const wishes = await prisma.wishlistGame.findMany({
    where: { bggId: { not: null }, bggEnrichedAt: null },
    select: { id: true, bggId: true },
    take: 20,
  });

  for (const wish of wishes) {
    try {
      const detail = await getBggGame(wish.bggId!);
      if (!detail) { failed++; continue; }

      await prisma.wishlistGame.update({
        where: { id: wish.id },
        data: {
          thumbnail:    detail.thumbnail    || undefined,
          image:        detail.image        || undefined,
          description:  detail.description  || undefined,
          designers:    detail.designers?.length ? JSON.stringify(detail.designers) : undefined,
          mechanics:    detail.mechanics?.length ? JSON.stringify(detail.mechanics) : undefined,
          bggRating:    detail.bggRating    ?? undefined,
          bggWeight:    detail.bggWeight    ?? undefined,
          minPlayers:   detail.minPlayers   ?? undefined,
          maxPlayers:   detail.maxPlayers   ?? undefined,
          playTime:     detail.playTime     ?? undefined,
          yearPublished: detail.yearPublished ?? undefined,
          bggEnrichedAt: new Date(),
        },
      });
      enriched++;
      await new Promise(r => setTimeout(r, 200));
    } catch {
      failed++;
    }
  }

  const remaining = await prisma.game.count({
    where: { bggId: { not: null }, bggEnrichedAt: null },
  });

  return NextResponse.json({ enriched, failed, remaining });
}
