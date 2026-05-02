"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ExternalLink, Download } from "lucide-react";
import { GAME_TYPES, GAME_STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
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
  sleeves: string;
  thumbnail: string | null;
  bggRating: number | null;
  gameSleeves?: GameSleeve[];
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
  initialLimit: number;
  initialSort: string;
}

export default function CollectionTable({
  games,
  total,
  page,
  totalPages,
  initialSearch,
  initialStatus,
  initialType,
  initialLimit,
  initialSort,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [type, setType]     = useState(initialType);
  const [limit, setLimit]   = useState(initialLimit);
  const [sort, setSort]     = useState(initialSort);

  function buildParams(overrides: Record<string, string>) {
    const merged = { search, status, type, page: String(page), limit: String(limit), sort, ...overrides };
    const p = new URLSearchParams();
    if (merged.search) p.set("search", merged.search);
    if (merged.status) p.set("status", merged.status);
    if (merged.type)   p.set("type",   merged.type);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    if (merged.limit && merged.limit !== "20") p.set("limit", merged.limit);
    if (merged.sort && merged.sort !== "name_asc") p.set("sort", merged.sort);
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
  function onSort(val: string)   { setSort(val);   push({ sort:   val, page: "1" }); }
  function onLimit(val: number)  { setLimit(val);  push({ limit: String(val), page: "1" }); }
  function goPage(p: number)     { push({ page: String(p) }); }

  // URL corrente con tutti i filtri attivi — passata come "from" ai link dei giochi
  const fromUrl = (() => {
    const qs = buildParams({});
    return `/collection${qs ? `?${qs}` : ""}`;
  })();

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center py-3">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cerca per nome…"
            className="w-full pl-8 text-sm"
          />
        </div>
        <select value={status} onChange={(e) => onStatus(e.target.value)} className="text-sm">
          <option value="">Tutti gli stati</option>
          {GAME_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => onType(e.target.value)} className="text-sm">
          <option value="">Tutti i tipi</option>
          {GAME_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => onSort(e.target.value)} className="text-sm">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="text-sm">
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n} / pag.</option>
          ))}
        </select>
        <a href={exportUrl()} download className="btn-ghost p-2" title="Esporta CSV">
          <Download size={14} style={{ color: "var(--text-muted)" }} />
        </a>
        {isPending && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Caricamento…</span>
        )}
      </div>

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
              <th>Inserto</th>
              <th>Bustine</th>
              <th>Rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {games.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
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
                  <span className={`badge ${STATUS_COLORS[game.status as keyof typeof STATUS_COLORS] ?? "bg-gray-800 text-gray-300"}`}>
                    {STATUS_LABELS[game.status as keyof typeof STATUS_LABELS] ?? game.status}
                  </span>
                </td>
                <td className="text-right text-sm">
                  {game.cost != null ? `€${game.cost.toFixed(2)}` : <span style={{ color: "var(--text-muted)" }}>—</span>}
                </td>
                <td className="text-right text-sm">
                  {game.salePrice != null ? `€${game.salePrice.toFixed(2)}` : <span style={{ color: "var(--text-muted)" }}>—</span>}
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
