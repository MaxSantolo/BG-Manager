"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { Avatar } from "@/components/PlayerPicker";
import { apiFetch } from "@/lib/fetchClient";

interface LoanGame { id: number; name: string; thumbnail: string | null }
interface Loan {
  id: number;
  borrower: string;
  loanDate: string;
  returnDate: string | null;
  returned: boolean;
  notes: string | null;
  game: LoanGame | null;
}
interface RegistryPlayer { id: number; name: string; avatarUrl: string | null }

function daysBetween(from: string, to = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000));
}

export default function AllLoans({ initialLoans }: { initialLoans: Loan[] }) {
  const { show } = useToast();
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [registry, setRegistry] = useState<RegistryPlayer[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/players")
      .then(r => r.json())
      .then(d => { if (!cancelled) setRegistry(Array.isArray(d?.players) ? d.players : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const avatarFor = (name: string) => registry.find(r => r.name === name)?.avatarUrl ?? null;

  const active = loans.filter(l => !l.returned)
    .sort((a, b) => new Date(a.loanDate).getTime() - new Date(b.loanDate).getTime()); // longest out first
  const history = loans.filter(l => l.returned)
    .sort((a, b) => new Date(b.returnDate ?? b.loanDate).getTime() - new Date(a.returnDate ?? a.loanDate).getTime());

  async function markReturned(id: number) {
    setBusyId(id);
    try {
      const res = await apiFetch<Loan>(`/api/loans/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returned: true }),
      });
      if (res.ok && res.data) {
        setLoans(prev => prev.map(l => (l.id === id ? { ...l, ...res.data, game: l.game } : l)));
        show("Segnato come restituito");
      } else {
        show("Operazione non riuscita.", "error");
      }
    } finally { setBusyId(null); }
  }

  async function deleteLoan(id: number) {
    if (!confirm("Eliminare questo prestito?")) return;
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/loans/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLoans(prev => prev.filter(l => l.id !== id));
        show("Prestito eliminato");
      } else {
        show(res.networkError ? "Connessione assente. Riprova." : "Eliminazione non riuscita.", "error");
      }
    } finally { setBusyId(null); }
  }

  const cover = (g: LoanGame | null) =>
    g?.thumbnail
      ? <img src={g.thumbnail} alt="" className="w-9 h-9 object-contain rounded flex-shrink-0" />
      : <div className="w-9 h-9 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />;

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Fuori casa {active.length > 0 && `(${active.length})`}
        </h2>
        {active.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nessun gioco in prestito.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {active.map((l) => {
              const days = daysBetween(l.loanDate);
              return (
                <div key={l.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  {cover(l.game)}
                  <div className="flex-1 min-w-0">
                    {l.game ? (
                      <Link href={`/collection/${l.game.id}`} className="text-sm font-medium truncate block"
                        style={{ color: "var(--accent-blue-light)", textDecoration: "none" }}>
                        {l.game.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Gioco rimosso</span>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Avatar name={l.borrower} url={avatarFor(l.borrower)} size={18} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{l.borrower}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        · da {days} giorn{days === 1 ? "o" : "i"}
                      </span>
                    </div>
                    {l.notes && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{l.notes}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => markReturned(l.id)} disabled={busyId === l.id}
                      className="btn-ghost p-1.5" title="Segna come restituito"
                      style={{ color: "var(--accent-blue-light)" }}>
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={() => deleteLoan(l.id)} disabled={busyId === l.id}
                      className="btn-ghost p-1.5" title="Elimina">
                      <Trash2 size={14} style={{ color: "var(--accent-red-light)" }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Storico ({history.length})
          </h2>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {history.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 text-sm">
                {cover(l.game)}
                <div className="flex-1 min-w-0">
                  {l.game ? (
                    <Link href={`/collection/${l.game.id}`} className="truncate block"
                      style={{ color: "var(--text-primary)", textDecoration: "none" }}>{l.game.name}</Link>
                  ) : <span style={{ color: "var(--text-muted)" }}>Gioco rimosso</span>}
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {l.borrower} · {new Date(l.loanDate).toLocaleDateString("it-IT")}
                    {l.returnDate && ` → ${new Date(l.returnDate).toLocaleDateString("it-IT")}`}
                  </span>
                </div>
                <button onClick={() => deleteLoan(l.id)} disabled={busyId === l.id} className="btn-ghost p-1 flex-shrink-0">
                  <Trash2 size={12} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
