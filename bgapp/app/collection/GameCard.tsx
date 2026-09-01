import Link from "next/link";
import { ExternalLink } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

interface GameSleeve {
  qty: number;
  sleeve: { size: string; label: string | null };
}

interface GameCardProps {
  id: number;
  bggId: number | null;
  name: string;
  type: string;
  cost: number | null;
  salePrice: number | null;
  status: string;
  insert: string;
  thumbnail: string | null;
  bggRating: number | null;
  gameSleeves?: GameSleeve[];
  loans?: { id: number }[];
  fromUrl?: string;
}

export default function GameCard({
  id,
  bggId,
  name,
  type,
  cost,
  salePrice,
  status,
  insert,
  thumbnail,
  bggRating,
  gameSleeves,
  loans,
  fromUrl,
}: GameCardProps) {
  return (
    <Link
      href={fromUrl ? `/collection/${id}?from=${encodeURIComponent(fromUrl)}` : `/collection/${id}`}
      className="block bg-white dark:bg-zinc-900 rounded-lg shadow p-4 flex gap-3 items-center focus:outline-none focus:ring-2 focus:ring-accent-red"
      style={{ textDecoration: "none" }}
      tabIndex={0}
    >
      {thumbnail && (
        <img src={thumbnail} alt="" className="w-16 h-16 object-contain rounded" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base truncate" style={{ color: "var(--text-primary)" }}>{name}</span>
          {bggId && (
            <a
              href={`https://boardgamegeek.com/boardgame/${bggId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1"
              onClick={e => e.stopPropagation()}
              tabIndex={-1}
            >
              <ExternalLink size={14} style={{ color: "var(--text-muted)" }} />
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-1 text-xs">
          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800" style={{ color: "var(--text-secondary)" }}>{type}</span>
          <StatusBadge status={status} />
          {loans && loans.length > 0 && <span className="badge bg-amber-900 text-amber-200">In prestito</span>}
          {cost != null && <span>Costo: €{cost.toFixed(2)}</span>}
          {salePrice != null && <span>Vendita: €{salePrice.toFixed(2)}</span>}
{insert && <span>Inserto: {insert}</span>}
          {gameSleeves && gameSleeves.length > 0 && (
            <span>Bustine: {gameSleeves.map(gs => `${gs.sleeve.size}${gs.sleeve.label ? ` (${gs.sleeve.label})` : ""} ×${gs.qty}`).join(", ")}</span>
          )}
          {bggRating && <span>Rating: {bggRating.toFixed(1)}</span>}
        </div>
      </div>
    </Link>
  );
}
