/**
 * Formato numeri della pagina Statistiche: all'italiana, con il simbolo davanti
 * come nel resto dell'app ("€10.337,15"). Il resto dell'app per ora resta
 * "€40.00": la scelta è stata limitata a questa pagina, dove gli importi grandi
 * erano illeggibili. Modulo puro, usato sia dal server sia dal client.
 */
// useGrouping "always": la regola italiana di Intl non raggruppa le 4 cifre
// ("3199,56"), e accanto a "10.337,15" sembravano due formati diversi.
const MONEY = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const INT = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" });

/** "€10.337,15" */
export const eur = (n: number) => `€${MONEY.format(n)}`;
/** "+€5,06" / "−€62,00" (segno davanti alla valuta, meno tipografico). */
export const signedEur = (n: number) => `${n >= 0 ? "+" : "−"}€${MONEY.format(Math.abs(n))}`;
/** "1.234" */
export const num = (n: number) => INT.format(n);
/** "7,70" */
export const dec = (n: number, digits = 2) =>
  new Intl.NumberFormat("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: "always" }).format(n);
