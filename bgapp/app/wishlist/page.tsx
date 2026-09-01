import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { GAME_TYPES } from "@/lib/types";

interface SearchParams {
  search?: string;
  type?: string;
}

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { search = "", type = "" } = await searchParams;

  const where: Record<string, unknown> = {};
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (type) where.type = type;

  const games = await prisma.wishlistGame.findMany({
    where,
    orderBy: [{ desirability: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Lista Desiderata
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {games.length} giochi
          </p>
        </div>
        <Link href="/wishlist/new" className="btn-primary">
          <Plus size={15} /> Aggiungi
        </Link>
      </div>

      {/* Filters */}
      <form method="get" className="card flex flex-wrap gap-3 items-center py-3">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Cerca…"
          className="flex-1 min-w-40 text-sm"
        />
        <select name="type" defaultValue={type} className="text-sm">
          <option value="">Tutti i tipi</option>
          {GAME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className="btn-secondary text-sm">Filtra</button>
      </form>

      {/* Grid */}
      {games.length === 0 ? (
        <div className="card text-center py-12" style={{ color: "var(--text-muted)" }}>
          Nessun gioco nella wishlist
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/wishlist/${game.id}`}
              className="card hover:border-accent-blue-light transition-colors flex gap-3"
              style={{ textDecoration: "none" }}
            >
              {game.thumbnail && (
                <img
                  src={game.thumbnail}
                  alt=""
                  className="w-16 h-16 object-contain rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
                  {game.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {game.type}
                  {game.yearPublished && ` · ${game.yearPublished}`}
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < (game.desirability ?? 0) ? "var(--accent-red-light)" : "transparent"}
                      stroke={i < (game.desirability ?? 0) ? "var(--accent-red-light)" : "var(--text-muted)"}
                    />
                  ))}
                </div>
                {game.valueRange && (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    €{game.valueRange}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
