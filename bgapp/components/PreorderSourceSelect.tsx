"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useToast } from "@/components/Toast";

export interface Source { id: number; name: string }

/** Provenienza: scegli dal registro o aggiungi una voce sul posto. */
export default function SourceSelect({ value, sources, onChange, onCreated }: {
  value: number | null; sources: Source[];
  onChange: (id: number | null) => void; onCreated: (s: Source) => void;
}) {
  const { show } = useToast();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const res = await apiFetch<Source & { error?: string }>("/api/preorder-sources", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }),
      });
      if (!res.ok || !res.data?.id) { show(res.data?.error ?? "Provenienza non creata.", "error"); return; }
      onCreated({ id: res.data.id, name: res.data.name });
      onChange(res.data.id);
      setName(""); setCreating(false);
    } finally {
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <div className="flex items-center gap-1.5">
        <input type="text" value={name} autoFocus onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create(); } }}
          placeholder="es. Kickstarter" className="w-full text-sm" />
        <button type="button" onClick={create} disabled={busy || !name.trim()} className="btn-primary text-sm px-3">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Crea"}
        </button>
        <button type="button" onClick={() => { setCreating(false); setName(""); }} className="btn-ghost p-1.5" aria-label="Annulla">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full text-sm">
        <option value="">— non indicata —</option>
        {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="button" onClick={() => setCreating(true)} className="btn-ghost text-xs whitespace-nowrap"
        style={{ color: "var(--accent-blue-light)" }}>
        <Plus size={13} /> Nuova
      </button>
    </div>
  );
}
