import { prisma } from "@/lib/prisma";
import { HandCoins } from "lucide-react";
import SoldList from "./SoldList";

export const dynamic = "force-dynamic";

/** I giochi venduti: fuori dalla Collezione e dal totale, qui con i loro conti. */
export default async function SoldPage() {
  const games = await prisma.game.findMany({
    where: { status: "Venduto" },
    select: { id: true, name: true, thumbnail: true, type: true, cost: true, salePrice: true, saleDate: true },
    orderBy: [{ saleDate: { sort: "desc", nulls: "last" } }, { name: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <HandCoins size={20} style={{ color: "var(--accent-red-light)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Venduti</h1>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          I giochi che hai venduto. Non compaiono in Collezione e non contano nel totale dei giochi.
        </p>
      </div>
      <SoldList games={games.map((g) => ({ ...g, saleDate: g.saleDate ? g.saleDate.toISOString() : null }))} />
    </div>
  );
}
