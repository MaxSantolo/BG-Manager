"use client";

import { useState } from "react";
import { Save, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";

interface Props {
  initialUsername: string;
  initialPassword: string;
}

export default function SettingsForm({ initialUsername, initialPassword }: Props) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState(initialPassword);
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bggUsername: username.trim() || null, bggPassword: password || null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
      style={{ color: "var(--text-secondary)" }}>{children}</label>
  );

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
        </div>
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
      </div>
    </form>
  );
}
