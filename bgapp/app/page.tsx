import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Library, Heart, BookOpen, BarChart3, Plus } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import RandomPicker from "@/components/RandomPicker";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [totalGames, wishlistCount, activeLoans, recentGames, forSaleGames, aggregate] =
    await Promise.all([
      prisma.game.count(),
      prisma.wishlistGame.count(),
      prisma.loan.count({ where: { returned: false } }),
      prisma.game.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, name: true, thumbnail: true, status: true },
      }),
      prisma.game.findMany({
        where: { status: "InVendita" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, thumbnail: true, cost: true, salePrice: true },
      }),
      prisma.game.aggregate({ _sum: { cost: true } }),
    ]);

  const totalInvested = aggregate._sum.cost ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>BG Manager</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Benvenuto nella tua collezione</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/collection" className="card text-center space-y-1" style={{ textDecoration: "none" }}>
          <Library size={22} className="mx-auto" style={{ color: "var(--accent-blue-light)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalGames}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Giochi</p>
        </Link>
        <Link href="/wishlist" className="card text-center space-y-1" style={{ textDecoration: "none" }}>
          <Heart size={22} className="mx-auto" style={{ color: "var(--accent-red-light)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{wishlistCount}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Wishlist</p>
        </Link>
        <div className="card text-center space-y-1">
          <BarChart3 size={22} className="mx-auto" style={{ color: "var(--text-muted)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>€{totalInvested.toFixed(0)}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Investito</p>
        </div>
        <div className="card text-center space-y-1">
          <BookOpen size={22} className="mx-auto"
            style={{ color: activeLoans > 0 ? "var(--accent-red-light)" : "var(--text-muted)" }} />
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{activeLoans}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Prestiti attivi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aggiunti di recente */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Aggiunti di recente
            </h2>
            <Link href="/collection/new" className="btn-ghost text-xs flex items-center gap-1"
              style={{ color: "var(--accent-blue-light)" }}>
              <Plus size={12} /> Aggiungi
            </Link>
          </div>
          {recentGames.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessun gioco ancora.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentGames.map((g) => (
                <Link key={g.id} href={`/collection/${g.id}`}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                  style={{ textDecoration: "none" }}>
                  {g.thumbnail
                    ? <img src={g.thumbnail} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                    : <div className="w-8 h-8 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />
                  }
                  <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{g.name}</span>
                  <span className={`badge text-xs ${STATUS_COLORS[g.status as keyof typeof STATUS_COLORS] ?? ""}`}>
                    {STATUS_LABELS[g.status as keyof typeof STATUS_LABELS] ?? g.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* In vendita */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>In vendita</h2>
            <Link href="/collection?status=InVendita" className="btn-ghost text-xs"
              style={{ color: "var(--accent-blue-light)" }}>
              Vedi tutti
            </Link>
          </div>
          {forSaleGames.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessun gioco in vendita.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {forSaleGames.map((g) => (
                <Link key={g.id} href={`/collection/${g.id}`}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                  style={{ textDecoration: "none" }}>
                  {g.thumbnail
                    ? <img src={g.thumbnail} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                    : <div className="w-8 h-8 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />
                  }
                  <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{g.name}</span>
                  <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                    {g.salePrice != null ? `€${g.salePrice.toFixed(0)}` : g.cost != null ? `€${g.cost.toFixed(0)}` : "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 items-center">
        <Link href="/collection" className="btn-secondary text-sm flex items-center gap-2">
          <Library size={14} /> Collezione
        </Link>
        <Link href="/wishlist" className="btn-secondary text-sm flex items-center gap-2">
          <Heart size={14} /> Wishlist
        </Link>
        <Link href="/sleeves" className="btn-secondary text-sm flex items-center gap-2">
          <BookOpen size={14} /> Bustine
        </Link>
        <Link href="/statistics" className="btn-secondary text-sm flex items-center gap-2">
          <BarChart3 size={14} /> Statistiche
        </Link>
        <RandomPicker />
      </div>
    </div>
  );
}
