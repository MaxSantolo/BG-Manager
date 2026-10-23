"use client";

import { useT } from "./LanguageProvider";
import type { Lang } from "@/lib/i18n";

/** Interruttore IT / EN. Scrive il cookie e ricarica (vedi LanguageProvider). */
export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useT();
  const opt = (l: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      className={compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"}
      style={{
        borderRadius: 6,
        fontWeight: 600,
        backgroundColor: lang === l ? "var(--accent-red)" : "transparent",
        color: lang === l ? "#fff" : "var(--text-muted)",
      }}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex items-center gap-0.5" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 2 }}>
      {opt("it", "IT")}
      {opt("en", "EN")}
    </div>
  );
}
