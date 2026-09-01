import { prisma } from "@/lib/prisma";

export type BggConflict = { kind: "collection" | "wishlist"; id: number; name: string };

/**
 * A game linked to a BGG id must be unique across the app: at most one
 * collection row, and never also on the wishlist (BGG has a single collection
 * item per game, so duplicates break status push/sync). Games with no bggId —
 * manual entries not on BGG — are exempt and may repeat freely.
 *
 * Returns the conflicting row, or null if the id is free. `ignore` skips the
 * row currently being edited so re-saving it isn't seen as a clash.
 */
export async function findBggConflict(
  bggId: number,
  ignore?: { collectionId?: number; wishlistId?: number }
): Promise<BggConflict | null> {
  const [game, wish] = await Promise.all([
    prisma.game.findFirst({
      where: { bggId, ...(ignore?.collectionId ? { NOT: { id: ignore.collectionId } } : {}) },
      select: { id: true, name: true },
    }),
    prisma.wishlistGame.findFirst({
      where: { bggId, ...(ignore?.wishlistId ? { NOT: { id: ignore.wishlistId } } : {}) },
      select: { id: true, name: true },
    }),
  ]);
  if (game) return { kind: "collection", id: game.id, name: game.name };
  if (wish) return { kind: "wishlist", id: wish.id, name: wish.name };
  return null;
}

/** True when a thrown error is a Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { code?: string }).code === "P2002";
}

/** True when a thrown error is Prisma "record not found" (P2025), i.e. update/delete on a missing id. */
export function isNotFound(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { code?: string }).code === "P2025";
}
