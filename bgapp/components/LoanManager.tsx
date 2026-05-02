"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2, BookOpen } from "lucide-react";
import { useToast } from "./Toast";

interface Loan {
  id: number;
  borrower: string;
  loanDate: string;
  returnDate: string | null;
  returned: boolean;
  notes: string | null;
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

  const active = loans.filter((l) => !l.returned);
  const history = loans.filter((l) => l.returned);

  async function addLoan() {
    if (!borrower.trim()) return;
    setSaving(true);
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, borrower: borrower.trim(), loanDate, notes: notes || null }),
    });
    if (res.ok) {
      const loan = await res.json();
      setLoans((prev) => [loan, ...prev]);
      setBorrower(""); setNotes(""); setShowForm(false);
      show("Prestito registrato");
    }
    setSaving(false);
  }

  async function markReturned(id: number) {
    const res = await fetch(`/api/loans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returned: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLoans((prev) => prev.map((l) => (l.id === id ? updated : l)));
      show("Segnato come restituito");
    }
  }

  async function deleteLoan(id: number) {
    if (!confirm("Eliminare questo prestito?")) return;
    await fetch(`/api/loans/${id}`, { method: "DELETE" });
    setLoans((prev) => prev.filter((l) => l.id !== id));
    show("Prestito eliminato");
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
              {active.length} attivo{active.length > 1 ? "i" : ""}
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
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Prestato a *
              </label>
              <input value={borrower} onChange={(e) => setBorrower(e.target.value)}
                className="w-full text-sm" placeholder="Nome persona" />
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
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{l.borrower}</span>
                <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                  dal {new Date(l.loanDate).toLocaleDateString("it-IT")}
                </span>
                {l.notes && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{l.notes}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => markReturned(l.id)} className="btn-ghost p-1.5 text-xs flex items-center gap-1"
                  title="Segna come restituito" style={{ color: "var(--accent-blue-light)" }}>
                  <RotateCcw size={13} />
                </button>
                <button onClick={() => deleteLoan(l.id)} className="btn-ghost p-1.5"
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
                <button onClick={() => deleteLoan(l.id)} className="btn-ghost p-1">
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
