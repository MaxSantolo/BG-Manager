"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Library, Heart, BarChart3, BookOpen, LogOut, Menu, Dice5, Trophy, Settings, Users } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/collection", label: "Collezione", icon: Library },
  { href: "/decide", label: "Cosa giochiamo", icon: Dice5 },
  { href: "/wishlist", label: "Desiderata", icon: Heart },
  { href: "/plays", label: "Partite", icon: Trophy },
  { href: "/sleeves", label: "Bustine", icon: BookOpen },
  { href: "/rubrica", label: "Rubrica", icon: Users },
  { href: "/statistics", label: "Statistiche", icon: BarChart3 },
];

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
    <nav
      className="safe-top"
      style={{
        backgroundColor: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-screen-2xl mx-auto px-4 flex items-center h-14 gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 mr-6"
          style={{ color: "var(--accent-red-light)" }}
        >
          <Dice5 size={22} strokeWidth={2.5} />
          <span
            className="font-bold text-lg tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            BG Manager
          </span>
        </Link>

        {/* Desktop menu */}
        <div className="hidden sm:flex items-center gap-1 flex-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? "var(--accent-red)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Hamburger menu button (mobile only) */}
        <button
          className="sm:hidden btn-ghost p-2 ml-auto"
          aria-label="Apri menu"
          onClick={() => setOpen((v) => !v)}
          style={{ color: "var(--text-muted)" }}
        >
          <Menu size={22} />
        </button>

        {/* Settings + Logout desktop */}
        <div className="hidden sm:flex items-center gap-1 ml-2">
          <Link href="/settings" className="btn-ghost p-1.5" title="Impostazioni"
            style={{ color: "var(--text-muted)" }}>
            <Settings size={16} />
          </Link>
          <button onClick={handleLogout} className="btn-ghost p-1.5" title="Esci"
            style={{ color: "var(--text-muted)" }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Mobile drawer menu */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute top-0 left-0 w-64 h-full bg-white dark:bg-zinc-900 shadow-lg p-5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>Menu</span>
              <button className="btn-ghost p-1" onClick={() => setOpen(false)} aria-label="Chiudi menu">
                ✕
              </button>
            </div>
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-2 py-2 rounded-md text-base font-medium"
                  style={{
                    backgroundColor: active ? "var(--accent-red)" : "transparent",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
            <Link href="/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-2 text-base font-medium"
              style={{ color: "var(--text-secondary)" }}>
              <Settings size={18} /> Impostazioni
            </Link>
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              className="btn-ghost flex items-center gap-2 px-2 py-2 mt-2 text-base font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut size={18} /> Esci
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
