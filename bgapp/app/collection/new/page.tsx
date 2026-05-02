import GameForm from "@/components/GameForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewGamePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/collection" className="btn-ghost p-1.5">
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Nuovo gioco
        </h1>
      </div>
      <GameForm mode="collection" />
    </div>
  );
}
