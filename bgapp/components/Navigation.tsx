"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Library, Heart, BarChart3, BookOpen, Package, LogOut, Menu, Dice5, Trophy, Settings, Users, Sparkles } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/i18n/LanguageProvider";
import LanguageToggle from "@/components/i18n/LanguageToggle";

const links = [
  { href: "/collection", key: "nav.collection", icon: Library },
  { href: "/decide", key: "nav.decide", icon: Dice5 },
  { href: "/wishlist", key: "nav.wishlist", icon: Heart },
  { href: "/plays", key: "nav.plays", icon: Trophy },
  { href: "/mai-giocati", key: "nav.neverPlayed", icon: Sparkles },
  { href: "/prestiti", key: "nav.loans", icon: BookOpen },
  { href: "/sleeves", key: "nav.sleeves", icon: Package },
  { href: "/rubrica", key: "nav.registry", icon: Users },
  { href: "/statistics", key: "nav.stats", icon: BarChart3 },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
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
        {/* Scorrevole invece che tagliata: con nove voci la riga non entra sotto
            i ~1180px (iPad in orizzontale, laptop piccoli). */}
        <div className="hidden sm:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto nav-scroll">
          {links.map(({ href, key, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: active ? "rgba(192, 52, 52, 0.16)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  boxShadow: active ? "inset 0 0 0 1px rgba(244, 125, 116, 0.25)" : "none",
                }}
              >
                <Icon size={15} />
                {t(key)}
              </Link>
            );
          })}
        </div>

        {/* Hamburger menu button (mobile only) */}
        <button
          className="sm:hidden btn-ghost p-2 ml-auto"
          aria-label={t("nav.openMenu")}
          onClick={() => setOpen((v) => !v)}
          style={{ color: "var(--text-muted)" }}
        >
          <Menu size={22} />
        </button>

        {/* Lingua + Settings + Logout desktop */}
        <div className="hidden sm:flex items-center gap-1 ml-2">
          <LanguageToggle compact />
          <Link href="/settings" className="btn-ghost p-1.5" title={t("nav.settings")}
            style={{ color: "var(--text-muted)" }}>
            <Settings size={16} />
          </Link>
          <button onClick={handleLogout} className="btn-ghost p-1.5" title={t("nav.logout")}
            style={{ color: "var(--text-muted)" }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Mobile drawer menu */}
      {open && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute top-0 left-0 w-64 h-full shadow-2xl p-5 flex flex-col gap-3"
            style={{ backgroundColor: "var(--bg-card)", borderRight: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>{t("nav.menu")}</span>
              <button className="btn-ghost p-1" onClick={() => setOpen(false)} aria-label={t("nav.closeMenu")}>
                ✕
              </button>
            </div>
            {links.map(({ href, key, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-2 py-2 rounded-md text-base font-medium"
                  style={{
                    backgroundColor: active ? "rgba(192, 52, 52, 0.16)" : "transparent",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={18} />
                  {t(key)}
                </Link>
              );
            })}
            <Link href="/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-2 text-base font-medium"
              style={{ color: "var(--text-secondary)" }}>
              <Settings size={18} /> {t("nav.settings")}
            </Link>
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              className="btn-ghost flex items-center gap-2 px-2 py-2 mt-2 text-base font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut size={18} /> {t("nav.logout")}
            </button>
            <div className="mt-2"><LanguageToggle /></div>
          </div>
        </div>
      )}
    </nav>
  );
}
