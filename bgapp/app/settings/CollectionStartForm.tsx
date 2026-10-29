"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useToast } from "@/components/Toast";
import DateInput from "@/components/DateInput";

/**
 * Da quando conta la collezione: le Statistiche ci dividono la spesa per i
 * giorni e ci mettono gli acquisti senza data. Si salva a parte dal resto delle
 * impostazioni (manda solo collectionStart).
 */
export default function CollectionStartForm({ initial }: { initial: string }) {
  const { show } = useToast();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await apiFetch<{ collectionStart: string | null; error?: string }>("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionStart: value }),
    });
    setSaving(false);
    if (!res.ok) {
      show(res.networkError ? "Connessione assente. Riprova." : res.data?.error ?? "Salvataggio non riuscito.", "error");
      return;
    }
    setSaved(res.data?.collectionStart ?? "");
    setValue(res.data?.collectionStart ?? "");
    show("Inizio della collezione salvato", "success");
  }

  return (
    <div className="card space-y-3 max-w-md">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Inizio della collezione</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Le Statistiche contano la spesa al giorno da qui, e ci mettono gli acquisti senza data (la collezione di partenza).
          Nessun gioco viene modificato. Vuoto = dal primo acquisto con una data.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-52"><DateInput value={value} onChange={setValue} className="w-full" aria-label="Inizio della collezione" /></div>
        <button type="button" onClick={save} disabled={saving || value === saved} className="btn-primary text-sm flex items-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salva
        </button>
        {value !== saved && (
          <button type="button" onClick={() => setValue(saved)} className="btn-ghost text-xs">Annulla</button>
        )}
      </div>
    </div>
  );
}
