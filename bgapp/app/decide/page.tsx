import { Dice5 } from "lucide-react";
import DecideTool from "./DecideTool";

export const dynamic = "force-dynamic";

export default function DecidePage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Dice5 size={20} style={{ color: "var(--accent-red-light)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Cosa giochiamo?
          </h1>
        </div>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Filtra la collezione per giocatori, peso e durata — poi lascia decidere al dado.
        </p>
      </div>
      <DecideTool />
    </div>
  );
}
