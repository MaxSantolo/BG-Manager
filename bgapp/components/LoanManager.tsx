"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, RotateCcw, Trash2, BookOpen } from "lucide-react";
import { useToast } from "./Toast";
import { Avatar } from "./PlayerPicker";
import { apiFetch } from "@/lib/fetchClient";

interface Loan {
  id: number;
  borrower: string;
  loanDate: string;
  returnDate: string | null;
  returned: boolean;
  notes: string | null;
}

interface RegistryPlayer {
  id: number;
  name: string;
  avatarUrl: string | null;
}

interface Props {
  gameId: number;
  initialLoans: Loan[];
}

export default function LoanManager({ gameId, initialLoans }: Props) {
  const { show } = useToast();
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [showForm, setShowForm] = useState(false);
  const [borrower, setBorrower] = useState("");
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [registry, setRegistry] = useState<RegistryPlayer[]>([]);
  const [suggest, setSuggest] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/players")
      .then(r => r.json())
      .then(d => { if (!cancelled) setRegistry(Array.isArray(d?.players) ? d.players : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  const active = loans.filter((l) => !l.returned);
  const history = loans.filter((l) => l.returned);

  const avatarFor = (name: string) => registry.find(r => r.name === name)?.avatarUrl ?? null;
  const matches = (borrower.trim()
    ? registry.filter(r => r.name.toLowerCase().includes(borrower.trim().toLowerCase()))
    : registry
  ).slice(0, 30);

  async function addLoan() {
    if (!borrower.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<Loan>("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, borrower: borrower.trim(), loanDate, notes: notes || null }),
      });
      if (res.ok && res.data) {
        setLoans((prev) => [res.data as Loan, ...prev]);
        setBorrower(""); setNotes(""); setShowForm(false);
        show("Prestito registrato");
      } else {
        show(res.networkError ? "Connessione assente. Riprova." : "Registrazione non riuscita.", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function markReturned(id: number) {
    setBusyId(id);
    try {
      const res = await apiFetch<Loan>(`/api/loans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returned: true }),
      });
      if (res.ok && res.data) {
        setLoans((prev) => prev.map((l) => (l.id === id ? (res.data as Loan) : l)));
        show("Segnato come restituito");
      } else {
        show("Operazione non riuscita.", "error");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function deleteLoan(id: number) {
    if (!confirm("Eliminare questo prestito?")) return;
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/loans/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLoans((prev) => prev.filter((l) => l.id !== id));
        show("Prestito eliminato");
      } else {
        show(res.networkError ? "Connessione assente. Riprova." : "Eliminazione non riuscita.", "error");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={15} style={{ color: "var(--accent-blue-light)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Prestiti
          </h2>
          {active.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "var(--accent-red)", color: "white" }}>
              {active.length} attiv{active.length > 1 ? "i" : "o"}
            </span>
          )}
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-ghost text-xs flex items-center gap-1"
          style={{ color: "var(--accent-blue-light)" }}>
          <Plus size={13} /> Aggiungi prestito
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-elevated)" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Prestato a *
              </label>
              <input value={borrower}
                onChange={(e) => { setBorrower(e.target.value); setSuggest(true); }}
                onFocus={() => setSuggest(true)}
                onBlur={() => { blurTimer.current = setTimeout(() => setSuggest(false), 150); }}
                className="w-full text-sm" placeholder="Nome persona" autoComplete="off" />
              {suggest && matches.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg overflow-hidden border text-sm max-h-44 overflow-y-auto"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}>
                  {matches.map((r) => (
                    <button key={r.id} type="button"
                      onMouseDown={(e) => { e.preventDefault(); setBorrower(r.name); setSuggest(false); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-white/5">
                      <Avatar name={r.name} url={r.avatarUrl} size={20} />
                      <span style={{ color: "var(--text-primary)" }}>{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Data prestito
              </label>
              <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)}
                className="w-full text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Note
              </label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm" placeholder="(opzionale)" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addLoan} disabled={saving || !borrower.trim()} className="btn-primary text-sm">
              Salva
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Annulla</button>
          </div>
        </div>
      )}

      {active.length === 0 && history.length === 0 && !showForm && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessun prestito registrato.</p>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Attivi</p>
          {active.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg"
              style={{ backgroundColor: "var(--bg-elevated)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={l.borrower} url={avatarFor(l.borrower)} size={26} />
                <div className="min-w-0">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{l.borrower}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                    dal {new Date(l.loanDate).toLocaleDateString("it-IT")}
                  </span>
                  {l.notes && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{l.notes}</p>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => markReturned(l.id)} disabled={busyId === l.id}
                  className="btn-ghost p-1.5 text-xs flex items-center gap-1"
                  title="Segna come restituito" style={{ color: "var(--accent-blue-light)" }}>
                  <RotateCcw size={13} />
                </button>
                <button onClick={() => deleteLoan(l.id)} disabled={busyId === l.id} className="btn-ghost p-1.5"
                  title="Elimina">
                  <Trash2 size={13} style={{ color: "var(--accent-red-light)" }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <details className="space-y-2">
          <summary className="text-xs font-semibold uppercase tracking-wide cursor-pointer"
            style={{ color: "var(--text-muted)" }}>
            Storico ({history.length})
          </summary>
          <div className="space-y-1 mt-2">
            {history.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 p-2 rounded text-sm"
                style={{ color: "var(--text-secondary)" }}>
                <span>
                  {l.borrower}
                  <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                    {new Date(l.loanDate).toLocaleDateString("it-IT")}
                    {l.returnDate && ` → ${new Date(l.returnDate).toLocaleDateString("it-IT")}`}
                  </span>
                </span>
                <button onClick={() => deleteLoan(l.id)} disabled={busyId === l.id} className="btn-ghost p-1">
                  <Trash2 size={12} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
