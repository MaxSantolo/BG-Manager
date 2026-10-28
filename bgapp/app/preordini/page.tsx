import { prisma } from "@/lib/prisma";
import { Truck } from "lucide-react";
import PreordersList from "./PreordersList";

export const dynamic = "force-dynamic";

/** I preordini: fuori dalla Collezione finché non arrivano. */
export default async function PreordersPage() {
  const [games, sources] = await Promise.all([
    prisma.game.findMany({
      where: { status: "Preordinato" },
      select: {
        id: true, name: true, thumbnail: true, cost: true,
        preorderSourceId: true, preorderPaid: true, preorderEta: true,
      },
      orderBy: [{ preorderEta: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    }),
    prisma.preorderSource.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Truck size={20} style={{ color: "var(--accent-red-light)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Preordini</h1>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Giochi ordinati ma non ancora in casa. Quando arrivano, segnali &laquo;Arrivato&raquo;: passano in Collezione.
        </p>
      </div>
      <PreordersList
        initialGames={games.map((g) => ({ ...g, preorderEta: g.preorderEta ? g.preorderEta.toISOString() : null }))}
        initialSources={sources}
      />
    </div>
  );
}
