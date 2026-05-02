import GameForm from "@/components/GameForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewWishlistPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/wishlist" className="btn-ghost p-1.5">
          <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Aggiungi alla wishlist
        </h1>
      </div>
      <GameForm mode="wishlist" />
    </div>
  );
}
