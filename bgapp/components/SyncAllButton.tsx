"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "./Toast";

/**
 * Manual full sync with BGG (collection + plays), forcing past the cooldown.
 * Uses the same /api/sync the auto-sync does; long client timeout because a
 * full sync can run ~20s+, and it must never hang the button.
 */
export default function SyncAllButton() {
  const router = useRouter();
  const { show } = useToast();
  const [syncing, setSyncing] = useState(false);

  async function syncAll() {
    setSyncing(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      let data: {
        skipped?: string; error?: string; loginFailed?: boolean; cookieDead?: boolean;
        games?: { imported: number; enriched: number; statusChanged: number; wishlistImported: number };
        plays?: { imported: number };
      } = {};
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
          signal: controller.signal,
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok && !data.error) { show("Sincronizzazione non riuscita.", "error"); return; }
      } finally {
        clearTimeout(timer);
      }

      if (data.skipped === "no-credentials") { show("Imposta prima username e password BGG.", "error"); return; }
      if (data.error) { show(`Sync BGG fallita: ${data.error}`, "error"); return; }

      const parts: string[] = [];
      if (data.games?.imported)        parts.push(`${data.games.imported} nuovi giochi`);
      if (data.games?.statusChanged)   parts.push(`${data.games.statusChanged} stati`);
      if (data.games?.wishlistImported)parts.push(`${data.games.wishlistImported} desiderata`);
      if (data.plays?.imported)        parts.push(`${data.plays.imported} partite`);
      const summary = parts.length ? `Sincronizzato: ${parts.join(", ")}.` : "Tutto già aggiornato.";
      if (data.cookieDead) {
        show(`${summary} Sessione BGG scaduta: le scritture su BGG non funzionano — rinnova il cookie.`, "error");
      } else if (data.loginFailed) {
        show(`${summary} Login BGG non riuscito: scritture su BGG non disponibili al momento.`, "error");
      } else {
        show(summary);
      }
      router.refresh();
    } catch {
      show("Sincronizzazione lenta o assente. Riprova.", "error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button type="button" onClick={syncAll} disabled={syncing}
      className="btn-secondary text-sm flex items-center gap-2">
      {syncing
        ? <><Loader2 size={14} className="animate-spin" /> Sincronizzo…</>
        : <><RefreshCw size={14} /> Sincronizza tutto</>}
    </button>
  );
}
