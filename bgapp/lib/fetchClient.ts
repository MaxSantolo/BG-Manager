/**
 * A fetch wrapper for client forms that CANNOT hang and NEVER throws.
 *
 * On mobile the app talks to endpoints that do slow BGG round-trips, and a
 * dropped cellular connection makes a bare `await fetch` reject — which, without
 * a try/catch, leaves the submit spinner spinning forever. This wrapper gives
 * every caller a uniform result and an absolute time ceiling, so the UI can
 * always resolve to success, error, or "timed out" and re-enable its button.
 */
export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  /** The request hit the client-side ceiling — the server may still finish it. */
  timedOut: boolean;
  /** A network failure (offline, DNS, reset) that isn't a timeout. */
  networkError: boolean;
}

export async function apiFetch<T = unknown>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 45000,
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const data = (await res.json().catch(() => null)) as T | null;
    return { ok: res.ok, status: res.status, data, timedOut: false, networkError: false };
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "AbortError";
    return { ok: false, status: 0, data: null, timedOut, networkError: !timedOut };
  } finally {
    clearTimeout(timer);
  }
}
