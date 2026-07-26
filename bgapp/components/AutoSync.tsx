"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useToast } from "./Toast";

/** Once per browser session — a fresh tab / PWA launch counts as an app start. */
const SESSION_KEY = "bgm_autosync_done";

export default function AutoSync() {
  const pathname = usePathname();
  const router   = useRouter();
  const { show } = useToast();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (pathname === "/login") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.headers.get("content-type")?.includes("application/json")) return;

        const data = await res.json();
        if (cancelled) return;

        // Nothing to do: disabled, no credentials, or synced a moment ago.
        if (data.skipped) return;

        if (!res.ok || data.error) {
          show(`Sync BGG fallita: ${data.error ?? res.status}`, "error");
          return;
        }

        const changed = (data.games?.imported ?? 0) + (data.games?.enriched ?? 0)
          + (data.games?.statusChanged ?? 0) + (data.games?.wishlistImported ?? 0)
          + (data.plays?.imported ?? 0);
        if (changed > 0) {
          router.refresh();
          const parts: string[] = [];
          if (data.games?.imported)      parts.push(`${data.games.imported} nuovi giochi`);
          if (data.games?.statusChanged) parts.push(`${data.games.statusChanged} stati aggiornati`);
          if (data.games?.wishlistImported) parts.push(`${data.games.wishlistImported} in desiderata`);
          if (data.plays?.imported)      parts.push(`${data.plays.imported} partite`);
          show(parts.length ? `Aggiornato da BGG: ${parts.join(", ")}` : "Collezione aggiornata da BGG");
        }
      } catch {
        // Offline or aborted — auto-sync stays silent, the manual button reports properly.
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pathname, router, show]);

  if (!syncing) return null;

  return (
    <div
      className="safe-fixed-bottom fixed left-6 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-xs shadow-lg"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
      }}
    >
      <RefreshCw size={13} className="animate-spin" />
      Sincronizzazione con BGG…
    </div>
  );
}
