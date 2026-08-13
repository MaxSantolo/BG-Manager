"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_STATUSES, labelFor, colorFor, type StatusDef } from "@/lib/status";

/**
 * Makes the user-configured statuses available to client components (badges,
 * the game form). Starts from the built-in defaults — which equal the stored
 * labels for anyone who hasn't customised — then refines from /api/settings, so
 * there's no flash in the common case.
 */
const StatusContext = createContext<StatusDef[]>(DEFAULT_STATUSES);

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState<StatusDef[]>(DEFAULT_STATUSES);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d?.statusConfig)) setStatuses(d.statusConfig); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return <StatusContext.Provider value={statuses}>{children}</StatusContext.Provider>;
}

export const useStatuses = () => useContext(StatusContext);
export function useStatusLabel(key: string) { return labelFor(useContext(StatusContext), key); }
export function useStatusColor(key: string) { return colorFor(useContext(StatusContext), key); }
