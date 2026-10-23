import "server-only";
import { cookies, headers } from "next/headers";
import { LANG_COOKIE, normalizeLang, translate, type Lang } from "@/lib/i18n";

/**
 * Lingua lato server: prima il cookie scelto dall'utente, poi (prima visita)
 * l'Accept-Language del browser. Così Mike vede subito l'inglese senza dover
 * toccare nulla, e la sua scelta esplicita vince.
 */
export async function getLang(): Promise<Lang> {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (chosen === "it" || chosen === "en") return chosen;
  const accept = (await headers()).get("accept-language");
  return normalizeLang(accept);
}

/** Comodo per i componenti server: una `t` già legata alla lingua corrente. */
export async function getT() {
  const lang = await getLang();
  return { lang, t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars) };
}
