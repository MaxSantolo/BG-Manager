"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

export interface LocationOption { id: number; name: string; gameCount?: number }

interface Props {
  value: number | null;
  onChange: (id: number | null) => void;
}

/** Pick where the box lives, or create a new position without leaving the form. */
export default function LocationPicker({ value, onChange }: Props) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ locations: LocationOption[] }>("/api/locations")
      .then(r => { if (!cancelled) setLocations(r.data?.locations ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function create() {
    const n = name.trim();
    if (!n) return;
    setBusy(true); setErr(null);
    try {
      const res = await apiFetch<LocationOption & { error?: string }>("/api/locations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (!res.ok || !res.data?.id) { setErr(res.data?.error ?? "Creazione non riuscita."); return; }
      const created = res.data;
      setLocations(prev => prev.some(l => l.id === created.id)
        ? prev
        : [...prev, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.id);
      setName(""); setCreating(false);
    } finally {
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); create(); } }}
            placeholder="es. Scaffale salotto, ripiano 2"
            className="w-full text-sm"
            autoFocus
          />
          <button type="button" onClick={create} disabled={busy || !name.trim()} className="btn-primary text-sm px-3">
            {busy ? <Loader2 size={14} className="animate-spin" /> : "Crea"}
          </button>
          <button type="button" onClick={() => { setCreating(false); setName(""); setErr(null); }}
            className="btn-ghost p-1.5" aria-label="Annulla">
            <X size={14} />
          </button>
        </div>
        {err && <p className="text-xs" style={{ color: "var(--accent-red-light)" }}>{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value ?? ""}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full text-sm"
      >
        <option value="">— nessuna —</option>
        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <button type="button" onClick={() => setCreating(true)}
        className="btn-ghost text-xs whitespace-nowrap" style={{ color: "var(--accent-blue-light)" }}>
        <Plus size={13} /> Nuova
      </button>
    </div>
  );
}
