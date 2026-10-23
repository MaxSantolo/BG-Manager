"use client";

import { useEffect, useState } from "react";

export interface Identity { id: number; name: string }

const KEY = "bgm_survey_player";

/**
 * Chi sei, ricordato dal browser (nessun account). È una comodità per-ospite:
 * localStorage può mancare o lanciare (finestra privata), quindi ogni accesso è
 * protetto e la pagina funziona anche senza. L'identità vera (voti, proposte) è
 * sempre il playerId mandato al server.
 */
export function useIdentity(): [Identity | null, (id: Identity | null) => void, boolean] {
  const [identity, setIdentityState] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p.id === "number" && typeof p.name === "string") setIdentityState(p);
      }
    } catch { /* localStorage non disponibile: si sceglie di nuovo il nome */ }
    setReady(true);
  }, []);

  function setIdentity(id: Identity | null) {
    setIdentityState(id);
    try {
      if (id) localStorage.setItem(KEY, JSON.stringify(id));
      else localStorage.removeItem(KEY);
    } catch { /* non ricordato, pazienza */ }
  }

  return [identity, setIdentity, ready];
}
