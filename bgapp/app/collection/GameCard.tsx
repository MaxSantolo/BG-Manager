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
  location?: { id: number; name: string } | null;
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
  location,
  fromUrl,
}: GameCardProps) {
  return (
    // La scheda porta al gioco con un link steso sopra (absolute inset-0), non
    // avvolgendo tutto in un <a>: dentro c'è il link a BGG, e un <a> dentro un <a>
    // non è HTML valido (il browser spezza la scheda, React segnala l'idratazione).
    <div className="card p-3.5 flex gap-3 items-center transition-colors hover:border-[var(--border-light)] relative">
      <Link
        href={fromUrl ? `/collection/${id}?from=${encodeURIComponent(fromUrl)}` : `/collection/${id}`}
        aria-label={name}
        className="absolute inset-0 rounded-[inherit]"
      />
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
              className="ml-1 relative z-10"
              tabIndex={-1}
              aria-label="Apri su BoardGameGeek"
            >
              <ExternalLink size={14} style={{ color: "var(--text-muted)" }} />
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-1 text-xs">
          <span className="px-2 py-0.5 rounded-md" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>{type}</span>
          <StatusBadge status={status} />
          {loans && loans.length > 0 && <span className="badge bg-amber-900 text-amber-200">In prestito</span>}
          {cost != null && <span>Costo: €{cost.toFixed(2)}</span>}
          {salePrice != null && <span>Vendita: €{salePrice.toFixed(2)}</span>}
{location && <span>Posizione: {location.name}</span>}
          {insert && <span>Inserto: {insert}</span>}
          {gameSleeves && gameSleeves.length > 0 && (
            <span>Bustine: {gameSleeves.map(gs => `${gs.sleeve.size}${gs.sleeve.label ? ` (${gs.sleeve.label})` : ""} ×${gs.qty}`).join(", ")}</span>
          )}
          {bggRating && <span>Rating: {bggRating.toFixed(1)}</span>}
        </div>
      </div>
    </div>
  );
}
