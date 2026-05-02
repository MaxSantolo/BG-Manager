import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import CollectionTable from "./CollectionTable";
import EnrichButton from "./EnrichButton";
import CollectionImporter from "@/components/CollectionImporter";

interface SearchParams {
  search?: string;
  status?: string;
  type?: string;
  page?: string;
  limit?: string;
  sort?: string;
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { search = "", status = "", type = "", page = "1", limit: limitParam = "20", sort = "name_asc" } = await searchParams;
  const pageNum = parseInt(page);
  const limit   = [20, 40, 100].includes(parseInt(limitParam)) ? parseInt(limitParam) : 20;
  const skip    = (pageNum - 1) * limit;

  const orderBy: Record<string, unknown> = (() => {
    switch (sort) {
      case "name_desc":   return { name: "desc" };
      case "cost_asc":    return { cost: "asc" };
      case "cost_desc":   return { cost: "desc" };
      case "rating_desc": return { bggRating: "desc" };
      case "date_desc":   return { purchaseDate: "desc" };
      case "date_asc":    return { purchaseDate: "asc" };
      case "added_desc":  return { createdAt: "desc" };
      default:            return { name: "asc" };
    }
  })();

  const where = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    // Se non c'è filtro esplicito, escludi i giochi "Giocato (ospite)"
    ...(status ? { status } : { NOT: { status: "GiocatoEsterno" } }),
    ...(type   ? { type }   : {}),
  };

  const [games, total, unenriched, settings] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { gameSleeves: { include: { sleeve: true } } },
    }),
    prisma.game.count({ where }),
    prisma.game.count({ where: { bggId: { not: null }, OR: [{ thumbnail: null }, { description: null }] } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Collezione
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {total} giochi
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unenriched > 0 && <EnrichButton />}
          <CollectionImporter
            initialUsername={settings?.bggUsername ?? ""}
            initialPassword={settings?.bggPassword ?? ""}
          />
          <Link href="/collection/new" className="btn-primary">
            <Plus size={15} /> Aggiungi
          </Link>
        </div>
      </div>

      <CollectionTable
        games={games as never}
        total={total}
        page={pageNum}
        totalPages={totalPages}
        initialSearch={search}
        initialStatus={status}
        initialType={type}
        initialLimit={limit}
        initialSort={sort}
      />
    </div>
  );
}
