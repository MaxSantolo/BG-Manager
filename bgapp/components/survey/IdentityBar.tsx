"use client";

import { useEffect, useState } from "react";
import { UserRound, Check, Loader2, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useT } from "@/components/i18n/LanguageProvider";
import type { Identity } from "./useIdentity";

interface PlayerOpt { id: number; name: string; avatarUrl: string | null }

/** "Chi sei": scegli dall'elenco giocatori o creane uno nuovo (come in app). */
export default function IdentityBar({
  identity, onChange,
}: { identity: Identity | null; onChange: (id: Identity | null) => void }) {
  const { t } = useT();
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ players: PlayerOpt[] }>("/api/survey/players")
      .then(r => setPlayers(r.data?.players ?? []))
      .catch(() => {});
  }, []);

  async function createPlayer() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await apiFetch<PlayerOpt & { error?: string }>("/api/survey/players", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok && res.data?.id) {
        onChange({ id: res.data.id, name: res.data.name });
        setPlayers(prev => prev.some(p => p.id === res.data!.id) ? prev : [...prev, res.data!]);
        setCreating(false); setPicking(false); setNewName("");
      }
    } finally {
      setBusy(false);
    }
  }

  if (identity && !picking) {
    return (
      <div className="card p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <UserRound size={16} style={{ color: "var(--accent-red-light)" }} />
          <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
            {t("s.playingAs")} <strong style={{ color: "var(--text-primary)" }}>{identity.name}</strong>
          </span>
        </div>
        <button type="button" onClick={() => setPicking(true)}
          className="btn-ghost text-xs flex-shrink-0" style={{ color: "var(--accent-blue-light)" }}>
          {t("s.change")}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-3 space-y-2">
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("s.whoAreYou")}</p>

      {!creating ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {players.map(p => (
              <button key={p.id} type="button"
                onClick={() => { onChange({ id: p.id, name: p.name }); setPicking(false); }}
                className="badge" style={{
                  cursor: "pointer",
                  backgroundColor: identity?.id === p.id ? "var(--accent-red)" : "var(--bg-elevated)",
                  color: identity?.id === p.id ? "#fff" : "var(--text-secondary)",
                }}>
                {identity?.id === p.id && <Check size={11} className="inline mr-1" />}{p.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setCreating(true)}
            className="btn-ghost text-xs" style={{ color: "var(--accent-blue-light)" }}>
            <Plus size={13} /> {t("s.newName")}
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <input type="text" value={newName} autoFocus
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); createPlayer(); } }}
            placeholder={t("s.yourName")} className="w-full text-sm" />
          <button type="button" onClick={createPlayer} disabled={busy || !newName.trim()}
            className="btn-primary text-sm px-3">
            {busy ? <Loader2 size={14} className="animate-spin" /> : t("common.create")}
          </button>
          <button type="button" onClick={() => { setCreating(false); setNewName(""); }}
            className="btn-ghost p-1.5" aria-label="Annulla"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
