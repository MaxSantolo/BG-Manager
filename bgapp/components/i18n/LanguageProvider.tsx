"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, translate, type Lang } from "@/lib/i18n";

interface Ctx {
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<Ctx>({
  lang: "it",
  t: (k) => translate("it", k),
  setLang: () => {},
});

export const useT = () => useContext(LanguageContext);

/**
 * La lingua scelta dal server (cookie o Accept-Language) arriva come prop, così
 * il primo render client combacia col server (niente flash). Cambiare lingua
 * scrive il cookie e ricarica, così anche i componenti server si ridisegnano.
 */
export function LanguageProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const router = useRouter();

  function setLang(l: Lang) {
    try {
      // un anno, tutto il sito
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch { /* cookie non disponibili: pazienza */ }
    router.refresh();
  }

  const value: Ctx = {
    lang: initialLang,
    t: (key, vars) => translate(initialLang, key, vars),
    setLang,
  };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
