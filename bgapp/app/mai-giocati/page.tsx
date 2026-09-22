import { Sparkles } from "lucide-react";
import { findNeverPlayed } from "@/lib/neverPlayed";
import NeverPlayedList from "./NeverPlayedList";

export const dynamic = "force-dynamic";

export default async function NeverPlayedPage() {
  const games = await findNeverPlayed();

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles size={20} style={{ color: "var(--accent-red-light)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Mai giocati</h1>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Giochi in casa senza nessuna partita registrata, espansioni escluse. Se uno
          l&apos;hai giocato prima di tenere il registro, segnalo: sparisce da qui e resta
          segnato sulla scheda.
        </p>
      </div>
      <NeverPlayedList
        initialGames={games.map(g => ({
          id: g.id,
          name: g.name,
          thumbnail: g.thumbnail,
          status: g.status,
          type: g.type,
          location: g.location ? g.location.name : null,
        }))}
      />
    </div>
  );
}
