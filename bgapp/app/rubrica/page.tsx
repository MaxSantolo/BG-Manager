import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import RubricaManager from "./RubricaManager";

export const dynamic = "force-dynamic";

export default async function RubricaPage() {
  const [players, places] = await Promise.all([
    prisma.player.findMany({
      orderBy: [{ playCount: "desc" }, { name: "asc" }],
      select: { id: true, name: true, bggUsername: true, avatarUrl: true, playCount: true },
    }),
    prisma.place.findMany({
      orderBy: [{ playCount: "desc" }, { name: "asc" }],
      select: { id: true, name: true, imageUrl: true, playCount: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Users size={20} style={{ color: "var(--accent-red-light)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Giocatori e luoghi</h1>
        </div>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Rinomina, aggiungi un&apos;immagine, unisci i doppioni o elimina.
        </p>
      </div>
      <RubricaManager initialPlayers={players} initialPlaces={places} />
    </div>
  );
}
