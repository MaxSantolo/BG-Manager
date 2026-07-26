"use client";

import { useState } from "react";
import { Save, Loader2, Eye, EyeOff, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";

interface Props {
  initialUsername: string;
  initialPassword: string;
  initialAutoSync: boolean;
  initialLastSync: string | null;
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
    style={{ color: "var(--text-secondary)" }}>{children}</label>
);

function formatSync(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export default function SettingsForm({
  initialUsername, initialPassword, initialAutoSync, initialLastSync,
}: Props) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState(initialPassword);
  const [autoSync, setAutoSync] = useState(initialAutoSync);
  const [lastSync, setLastSync] = useState(initialLastSync);
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveErr, setSaveErr]   = useState<string | null>(null);
  // What the server actually holds, not what's typed in the box.
  const [storedPw, setStoredPw] = useState(!!initialPassword);

  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState<{ text: string; ok: boolean } | null>(null);

  async function persist(next: { autoSyncOnStart?: boolean } = {}) {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bggUsername: username.trim() || null,
        bggPassword: password || null,
        autoSyncOnStart: autoSync,
        ...next,
      }),
    });
    if (!res.ok) throw new Error(`Salvataggio fallito (${res.status})`);
    const data = await res.json();
    setStoredPw(!!data.bggPassword);
    return data;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveErr(null);
    try {
      await persist();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAutoSync() {
    const next = !autoSync;
    setAutoSync(next);
    await persist({ autoSyncOnStart: next });
  }

  async function syncNow() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();

      if (data.skipped === "no-credentials") {
        setSyncMsg({ text: "Salva prima username e password BGG.", ok: false });
      } else if (!res.ok || data.error) {
        setSyncMsg({ text: data.error ?? `Errore ${res.status}`, ok: false });
      } else {
        const parts = [
          `${data.games.imported} nuovi giochi`,
          `${data.games.statusChanged} stati aggiornati`,
          `${data.games.wishlistImported} in desiderata`,
          `${data.games.enriched} giochi arricchiti`,
          `${data.plays.imported} partite`,
        ];
        setSyncMsg({ text: parts.join(", ") + ".", ok: true });
        setLastSync(formatSync(new Date(data.lastSyncAt)));
      }
    } catch {
      setSyncMsg({ text: "Sincronizzazione non riuscita.", ok: false });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          BoardGameGeek
        </h2>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Le credenziali vengono usate per importare partite e collezione da BGG e per caricare
          nuove partite. La password è salvata nel database dell&apos;app (protetta dal login dell&apos;app).
        </p>
        <div>
          <Label>Username BGG</Label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            className="w-full" placeholder="es. MaxSantolo" />
        </div>
        <div>
          <Label>Password BGG</Label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pr-9"
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-ghost p-0.5">
              {showPw
                ? <EyeOff size={14} style={{ color: "var(--text-muted)" }} />
                : <Eye   size={14} style={{ color: "var(--text-muted)" }} />}
            </button>
          </div>
          <p className="text-xs mt-1.5 flex items-center gap-1.5"
            style={{ color: storedPw ? "#4ade80" : "var(--text-muted)" }}>
            {storedPw
              ? <><CheckCircle size={12} /> Password salvata nel database</>
              : <><AlertCircle size={12} /> Nessuna password salvata — serve solo per scrivere su BGG</>}
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Sincronizzazione
        </h2>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Aggiorna all&apos;avvio
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              A ogni apertura dell&apos;app scarica collezione e partite da BGG (max una volta
              ogni 10 minuti).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoSync}
            aria-label="Aggiorna all'avvio"
            onClick={toggleAutoSync}
            className="relative flex-shrink-0 rounded-full transition-colors"
            style={{
              width: 42, height: 24,
              backgroundColor: autoSync ? "var(--accent-red)" : "var(--bg-input)",
              border: "1px solid var(--border-light)",
            }}
          >
            <span
              className="absolute top-1/2 rounded-full transition-all"
              style={{
                width: 16, height: 16,
                transform: "translateY(-50%)",
                left: autoSync ? 22 : 4,
                backgroundColor: "var(--text-primary)",
              }}
            />
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-1">
          <button type="button" onClick={syncNow} disabled={syncing}
            className="btn-secondary text-sm flex items-center gap-2">
            {syncing
              ? <><Loader2 size={14} className="animate-spin" /> Sincronizzo…</>
              : <><RefreshCw size={14} /> Sincronizza ora</>}
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {lastSync ? `Ultimo aggiornamento: ${lastSync}` : "Mai sincronizzato"}
          </span>
        </div>

        {syncMsg && (
          <div className="flex items-start gap-2 text-sm"
            style={{ color: syncMsg.ok ? "#4ade80" : "var(--accent-red-light)" }}>
            {syncMsg.ok
              ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
              : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />}
            {syncMsg.text}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Salvataggio…</>
            : <><Save size={14} /> Salva impostazioni</>}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "#4ade80" }}>
            <CheckCircle size={14} /> Salvato
          </div>
        )}
        {saveErr && (
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--accent-red-light)" }}>
            <AlertCircle size={14} /> {saveErr}
          </div>
        )}
      </div>
    </form>
  );
}
