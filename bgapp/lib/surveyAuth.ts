/**
 * Auth dell'area sondaggi, separata da quella dell'app (APP_PASSWORD).
 * Stessa meccanica del login principale: hash SHA-256 della password in un
 * cookie, confronto costante lato proxy. Password condivisa fra tutti gli
 * ospiti (SURVEY_PASSWORD), in env Vercel — mai nel repo, che è pubblico.
 */
export const SURVEY_COOKIE = "bgm_survey";

export async function surveyTokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
