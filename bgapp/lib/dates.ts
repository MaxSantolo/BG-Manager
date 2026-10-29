/**
 * Calendar days, kept boring.
 *
 * Every day-shaped column here (play date, purchase, sale, loan) is a
 * TIMESTAMP WITHOUT TIME ZONE holding midnight. Postgres stores exactly that,
 * but the driver hands the value back interpreted in the PROCESS timezone: the
 * same row reads as "the 19th at 00:00Z" on Vercel (UTC) and as "the 18th at
 * 22:00Z" on a laptop in Rome. Formatting that second Date in Rome happens to
 * print the 19th again, so the two errors cancel out — until one of them is
 * missing and a play silently lands on the wrong day.
 *
 * Two rules stop that for good:
 *  - the day a stored value MEANS is read and printed in UTC (dayInput,
 *    formatDay, formatDayNum), whoever is running the code;
 *  - the only thing that follows a human clock is what "today" means as a form
 *    default (todayInput) — at 00:30 in Rome the user's today is not UTC's.
 *
 * The dev server runs with TZ=UTC (see package.json) so a laptop and Vercel
 * read and write identical values.
 */

/** The clock a server component must use when it means "the user's today". */
export const APP_TZ = "Europe/Rome";

/**
 * Today as YYYY-MM-DD for <input type="date">.
 * No argument = the viewer's own clock (right in a client component); pass
 * APP_TZ from a server component, where "local" would mean the server's UTC.
 */
export function todayInput(timeZone?: string): string {
  const now = new Date();
  if (timeZone) {
    // en-CA renders exactly YYYY-MM-DD, which is what the input wants.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A stored day as YYYY-MM-DD for <input type="date">. Empty string if unparsable. */
export function dayInput(val: unknown): string {
  if (!val) return "";
  const d = val instanceof Date ? val : new Date(String(val));
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** A stored day, written out: "19 set 2026". */
export function formatDay(val: Date | string): string {
  const d = val instanceof Date ? val : new Date(val);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(d);
}

/** A stored day, all numbers: "19/09/2026". */
export function formatDayNum(val: Date | string): string {
  const d = val instanceof Date ? val : new Date(val);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
  }).format(d);
}

/**
 * "AAAA-MM-GG" da un input → il giorno a mezzanotte UTC, o null se non è un
 * giorno vero. Controlla la forma, l'anno (un "0202" a metà digitazione non è
 * una data) e che il giorno esista: "2024-13-45" ha la forma giusta ma diventa
 * una Date non valida, e Prisma la rifiuta con un 500 invece di un 400.
 */
export function parseDayInput(v: string, minYear = 2000, maxYear = 2100): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const year = Number(v.slice(0, 4));
  if (year < minYear || year > maxYear) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? d : null;
}
