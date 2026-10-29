"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ExternalLink, Download, List, LayoutGrid } from "lucide-react";
import { GAME_TYPES } from "@/lib/types";
import { useStatuses } from "@/components/StatusProvider";
import { OUT_OF_COLLECTION } from "@/lib/status";
import StatusBadge from "@/components/StatusBadge";
import GameCard from "./GameCard";

interface GameSleeve {
  qty: number;
  sleeve: { size: string; label: string | null };
}

interface Game {
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
}

const PAGE_SIZES = [20, 40, 100];
const SORT_OPTIONS = [
  { value: "name_asc",    label: "Nome A→Z" },
  { value: "name_desc",   label: "Nome Z→A" },
  { value: "cost_asc",    label: "Costo ↑" },
  { value: "cost_desc",   label: "Costo ↓" },
  { value: "rating_desc", label: "Rating ↓" },
  { value: "date_desc",   label: "Acquisto recente" },
  { value: "date_asc",    label: "Acquisto vecchio" },
  { value: "added_desc",  label: "Aggiunto recente" },
];

interface Props {
  games: Game[];
  total: number;
  page: number;
  totalPages: number;
  initialSearch: string;
  initialStatus: string;
  initialType: string;
  initialLocation: string;
  initialLimit: number;
  initialSort: string;
  initialView: "list" | "covers";
  locations: { id: number; name: string }[];
}

export default function CollectionTable({
  games,
  total,
  page,
  totalPages,
  initialSearch,
  initialStatus,
  initialType,
  initialLocation,
  initialLimit,
  initialSort,
  initialView,
  locations,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const statuses = useStatuses();
  const [isPending, startTransition] = useTransition();
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [type, setType]     = useState(initialType);
  const [location, setLocation] = useState(initialLocation);
  const [limit, setLimit]   = useState(initialLimit);
  const [sort, setSort]     = useState(initialSort);
  const [view, setView]     = useState(initialView);

  function buildParams(overrides: Record<string, string>) {
    const merged = { search, status, type, location, page: String(page), limit: String(limit), sort, view, ...overrides };
    const p = new URLSearchParams();
    if (merged.search) p.set("search", merged.search);
    if (merged.status) p.set("status", merged.status);
    if (merged.type)   p.set("type",   merged.type);
    if (merged.location) p.set("location", merged.location);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    if (merged.limit && merged.limit !== "20") p.set("limit", merged.limit);
    if (merged.sort && merged.sort !== "name_asc") p.set("sort", merged.sort);
    if (merged.view === "covers") p.set("view", "covers");
    return p.toString();
  }

  function exportUrl() {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    if (type)   p.set("type", type);
    const qs = p.toString();
    return `/api/games/export${qs ? `?${qs}` : ""}`;
  }

  function push(overrides: Record<string, string>) {
    const qs = buildParams(overrides);
    startTransition(() => router.push(`${pathname}${qs ? `?${qs}` : ""}`));
  }

  function onSearch(val: string) {
    setSearch(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => push({ search: val, page: "1" }), 400);
  }

  function onStatus(val: string) { setStatus(val); push({ status: val, page: "1" }); }
  function onType(val: string)   { setType(val);   push({ type:   val, page: "1" }); }
  function onLocation(val: string) { setLocation(val); push({ location: val, page: "1" }); }
  function onSort(val: string)   { setSort(val);   push({ sort:   val, page: "1" }); }
  function onLimit(val: number)  { setLimit(val);  push({ limit: String(val), page: "1" }); }
  function goPage(p: number)     { push({ page: String(p) }); }
  // Un muro di 20 copertine non è un muro: passando alle copertine dal valore
  // predefinito si sale a 100 per pagina. Una scelta esplicita (40, 100) resta.
  function onView(v: "list" | "covers") {
    const lim = v === "covers" && limit === 20 ? 100 : limit;
    setView(v); setLimit(lim);
    push({ view: v, limit: String(lim), page: "1" });
  }

  // URL corrente con tutti i filtri attivi — passata come "from" ai link dei giochi
  const fromUrl = (() => {
    const qs = buildParams({});
    return `/collection${qs ? `?${qs}` : ""}`;
  })();

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="card grid grid-cols-2 gap-3 items-center py-3 sm:flex sm:flex-wrap">
        <div className="relative col-span-2 sm:flex-1 sm:min-w-40">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cerca per nome…"
            className="w-full pl-8 text-sm"
          />
        </div>
        <select value={status} onChange={(e) => onStatus(e.target.value)} className="text-sm w-full sm:w-auto">
          <option value="">Tutti gli stati</option>
          {statuses.filter((s) => !s.hidden && !OUT_OF_COLLECTION.includes(s.key)).map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => onType(e.target.value)} className="text-sm w-full sm:w-auto">
          <option value="">Tutti i tipi</option>
          {GAME_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {locations.length > 0 && (
          <select value={location} onChange={(e) => onLocation(e.target.value)} className="text-sm w-full sm:w-auto">
            <option value="">Tutte le posizioni</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
        <select value={sort} onChange={(e) => onSort(e.target.value)} className="text-sm w-full sm:w-auto">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="text-sm w-full sm:w-auto">
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n} / pag.</option>
          ))}
        </select>
        <div className="flex rounded-md overflow-hidden" role="group" aria-label="Vista"
          style={{ border: "1px solid var(--border)" }}>
          {([["list", List, "Elenco"], ["covers", LayoutGrid, "Copertine"]] as const).map(([v, Icon, label]) => (
            <button key={v} type="button" onClick={() => onView(v)} aria-pressed={view === v} title={label}
              className="px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5"
              style={{
                backgroundColor: view === v ? "rgba(192, 52, 52, 0.16)" : "transparent",
                color: view === v ? "var(--text-primary)" : "var(--text-muted)",
              }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <a href={exportUrl()} download className="btn-ghost p-2" title="Esporta CSV">
          <Download size={14} style={{ color: "var(--text-muted)" }} />
        </a>
        {isPending && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Caricamento…</span>
        )}
      </div>

      {view === "covers" && (
        games.length === 0 ? (
          <div className="card text-center py-8" style={{ color: "var(--text-muted)" }}>Nessun gioco trovato</div>
        ) : (
          // Muro di copertine: le miniature BGG, non le immagini piene (100 per pagina peserebbero megabyte).
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
            {games.map((g) => (
              <Link key={g.id} href={`/collection/${g.id}?from=${encodeURIComponent(fromUrl)}`} title={g.name}
                className="group relative block aspect-square overflow-hidden rounded-lg"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {g.thumbnail ? (
                  <>
                    <img src={g.thumbnail} alt={g.name} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                    {/* nome: sempre visibile al tocco, al passaggio del mouse dove il mouse c'è */}
                    {/* il padding sta fuori dal line-clamp, se no la terza riga spunta nel padding */}
                    <span className="absolute inset-x-0 bottom-0 px-1.5 pb-1 pt-5 transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                      style={{ background: "linear-gradient(transparent, rgba(5, 9, 18, 0.92))", color: "#fff" }}>
                      <span className="text-[11px] leading-tight line-clamp-2">{g.name}</span>
                    </span>
                  </>
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs"
                    style={{ color: "var(--text-secondary)" }}>{g.name}</span>
                )}
                {g.loans && g.loans.length > 0 && (
                  <span className="absolute top-1 right-1 badge bg-amber-900 text-amber-200 text-[10px]">In prestito</span>
                )}
              </Link>
            ))}
          </div>
        )
      )}

      {view === "list" && (<>
      {/* Mobile: Card view */}
      <div className="flex flex-col gap-3 sm:hidden">
        {games.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>Nessun gioco trovato</div>
        ) : (
          games.map((game) => <GameCard key={game.id} {...game} fromUrl={fromUrl} />)
        )}
      </div>
      {/* Tablet: Grid view */}
      <div className="hidden sm:grid lg:hidden grid-cols-2 md:grid-cols-3 gap-4">
        {games.length === 0 ? (
          <div className="col-span-full text-center py-8" style={{ color: "var(--text-muted)" }}>Nessun gioco trovato</div>
        ) : (
          games.map((game) => <GameCard key={game.id} {...game} fromUrl={fromUrl} />)
        )}
      </div>
      {/* Desktop: Table view */}
      <div className="card p-0 overflow-x-auto hidden lg:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Stato</th>
              <th className="text-right">Costo</th>
              <th className="text-right">Vendita</th>
              <th>Posizione</th>
              <th>Inserto</th>
              <th>Bustine</th>
              <th>Rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {games.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                  Nessun gioco trovato
                </td>
              </tr>
            )}
            {games.map((game) => (
              <tr key={game.id}>
                <td>
                  <div className="flex items-center gap-2">
                    {game.thumbnail && (
                      <img src={game.thumbnail} alt="" className="w-8 h-8 object-contain rounded" />
                    )}
                    <Link
                      href={`/collection/${game.id}?from=${encodeURIComponent(fromUrl)}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {game.name}
                    </Link>
                  </div>
                </td>
                <td>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{game.type}</span>
                </td>
                <td>
                  <div className="flex flex-wrap items-center gap-1">
                    <StatusBadge status={game.status} />
                    {game.loans && game.loans.length > 0 && (
                      <span className="badge bg-amber-900 text-amber-200">In prestito</span>
                    )}
                  </div>
                </td>
                <td className="text-right text-sm">
                  {game.cost != null ? `€${game.cost.toFixed(2)}` : <span style={{ color: "var(--text-muted)" }}>—</span>}
                </td>
                <td className="text-right text-sm">
                  {game.salePrice != null ? `€${game.salePrice.toFixed(2)}` : <span style={{ color: "var(--text-muted)" }}>—</span>}
                </td>
                <td className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {game.location?.name ?? <span style={{ color: "var(--text-muted)" }}>—</span>}
                </td>
                <td className="text-sm" style={{ color: "var(--text-secondary)" }}>{game.insert}</td>
                <td className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {game.gameSleeves && game.gameSleeves.length > 0
                    ? game.gameSleeves.map(gs => `${gs.sleeve.size}${gs.sleeve.label ? ` (${gs.sleeve.label})` : ""} ×${gs.qty}`).join(", ")
                    : <span style={{ color: "var(--text-muted)" }}>—</span>}
                </td>
                <td className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {game.bggRating ? game.bggRating.toFixed(1) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                </td>
                <td>
                  {game.bggId && (
                    <a href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                      target="_blank" rel="noopener noreferrer" className="btn-ghost p-1">
                      <ExternalLink size={12} style={{ color: "var(--text-muted)" }} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      </>)}

      <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
        <span>{total} giochi totali</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => goPage(page - 1)} disabled={page <= 1} className="btn-ghost p-1.5 disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <span className="px-2">{page} / {totalPages}</span>
            <button onClick={() => goPage(page + 1)} disabled={page >= totalPages} className="btn-ghost p-1.5 disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
