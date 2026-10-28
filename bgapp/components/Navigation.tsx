"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Library, Heart, BarChart3, BookOpen, Package, LogOut, Menu, Dice5, Trophy,
  Settings, Users, Sparkles, Truck, HandCoins, X, type LucideIcon,
} from "lucide-react";
import { useState } from "react";

interface Item { href: string; label: string; icon: LucideIcon; children?: Item[] }

/**
 * Voci raggruppate per senso. Preordini e Venduti stanno sotto Collezione: sono
 * le tre parti dei tuoi giochi (in casa, in arrivo, andati). Un'unica struttura
 * per la barra laterale (desktop) e il menu a scomparsa (mobile).
 */
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "I miei giochi",
    items: [
      {
        href: "/collection", label: "Collezione", icon: Library,
        children: [
          { href: "/preordini", label: "Preordini", icon: Truck },
          { href: "/venduti", label: "Venduti", icon: HandCoins },
        ],
      },
      { href: "/wishlist", label: "Desiderata", icon: Heart },
      { href: "/prestiti", label: "Prestiti", icon: BookOpen },
    ],
  },
  {
    label: "Si gioca",
    items: [
      { href: "/decide", label: "Cosa giochiamo", icon: Dice5 },
      { href: "/plays", label: "Partite", icon: Trophy },
      { href: "/mai-giocati", label: "Mai giocati", icon: Sparkles },
    ],
  },
  {
    label: "Strumenti",
    items: [
      { href: "/statistics", label: "Statistiche", icon: BarChart3 },
      { href: "/rubrica", label: "Rubrica", icon: Users },
      { href: "/sleeves", label: "Bustine", icon: Package },
    ],
  },
];

/** Attiva sulla pagina stessa e sulle sue sottopagine (/collection/123), non sui prefissi casuali. */
const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

function NavLink({ item, pathname, sub, onNavigate }: {
  item: Item; pathname: string; sub?: boolean; onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-md font-medium transition-colors ${sub ? "px-2.5 py-1.5 text-sm" : "px-2.5 py-2 text-sm"}`}
      style={{
        backgroundColor: active ? "rgba(192, 52, 52, 0.16)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        boxShadow: active ? "inset 0 0 0 1px rgba(244, 125, 116, 0.25)" : "none",
      }}
    >
      <Icon size={sub ? 14 : 16} style={{ color: active ? "var(--accent-red-light)" : "var(--text-muted)" }} />
      {item.label}
    </Link>
  );
}

function NavGroups({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-5">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="eyebrow px-2.5 mb-1.5" style={{ color: "var(--text-muted)" }}>{g.label}</p>
          <div className="space-y-0.5">
            {g.items.map((item) => (
              <div key={item.href}>
                <NavLink item={item} pathname={pathname} onNavigate={onNavigate} />
                {item.children && (
                  // sottovoci rientrate, con una linea che le lega alla voce madre
                  <div className="ml-4 mt-0.5 pl-2 space-y-0.5" style={{ borderLeft: "1px solid var(--border)" }}>
                    {item.children.map((c) => (
                      <NavLink key={c.href} item={c} pathname={pathname} sub onNavigate={onNavigate} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2" style={{ color: "var(--accent-red-light)" }}>
      <Dice5 size={22} strokeWidth={2.5} />
      <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>BG Manager</span>
    </Link>
  );
}

function FooterLinks({ pathname, onNavigate, onLogout }: {
  pathname: string; onNavigate?: () => void; onLogout: () => void;
}) {
  return (
    <div className="space-y-0.5 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
      <NavLink item={{ href: "/settings", label: "Impostazioni", icon: Settings }} pathname={pathname} onNavigate={onNavigate} />
      <button type="button" onClick={onLogout}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium btn-ghost"
        style={{ color: "var(--text-muted)" }}>
        <LogOut size={16} /> Esci
      </button>
    </div>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop (≥1024px): barra laterale fissa a tutta altezza */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen px-3 py-4 gap-5 overflow-y-auto"
        style={{ backgroundColor: "var(--bg-card)", borderRight: "1px solid var(--border)" }}
      >
        <div className="px-2.5"><Brand /></div>
        <nav className="flex-1" aria-label="Menu principale">
          <NavGroups pathname={pathname} />
        </nav>
        <FooterLinks pathname={pathname} onLogout={handleLogout} />
      </aside>

      {/* Mobile e tablet: barra in alto + menu a scomparsa con gli stessi gruppi */}
      <header
        className="lg:hidden safe-top"
        style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="px-4 flex items-center justify-between h-14">
          <Brand />
          <button className="btn-ghost p-2" aria-label="Apri menu" onClick={() => setOpen(true)}
            style={{ color: "var(--text-muted)" }}>
            <Menu size={22} />
          </button>
        </div>

        {open && (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
            <div
              className="safe-top absolute top-0 left-0 w-72 max-w-[85vw] h-full shadow-2xl p-4 flex flex-col gap-5 overflow-y-auto"
              style={{ backgroundColor: "var(--bg-card)", borderRight: "1px solid var(--border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-1">
                <Brand />
                <button className="btn-ghost p-1.5" onClick={() => setOpen(false)} aria-label="Chiudi menu">
                  <X size={18} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
              <nav className="flex-1" aria-label="Menu principale">
                <NavGroups pathname={pathname} onNavigate={() => setOpen(false)} />
              </nav>
              <FooterLinks pathname={pathname} onNavigate={() => setOpen(false)}
                onLogout={() => { setOpen(false); handleLogout(); }} />
            </div>
          </div>
        )}
      </header>
    </>
  );
}
