"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

interface Sleeve {
  id: number;
  size: string;
  label?: string;
  quantity: number;
}

interface SleeveEntry {
  sleeveId: number;
  qty: number;
}

interface Props {
  value: SleeveEntry[];
  onChange: (entries: SleeveEntry[]) => void;
}

export default function SleeveEditor({ value, onChange }: Props) {
  const [allSleeves, setAllSleeves] = useState<Sleeve[]>([]);
  // Snapshot of qty already credited to this game in the server-computed `available`.
  // We keep it stable so changing the input doesn't make `available` "drift".
  const initialQtyById = useRef<Map<number, number>>(new Map(value.map(e => [e.sleeveId, e.qty])));

  useEffect(() => {
    fetch("/api/sleeves/all")
      .then((res) => res.json())
      .then((data) => setAllSleeves(Array.isArray(data) ? data : []));
  }, []);

  // For a given sleeveId and the currently entered qty, compute remaining magazine after this assignment.
  function remainingFor(sleeveId: number, qty: number): number {
    const sleeve = allSleeves.find(s => s.id === sleeveId);
    if (!sleeve) return 0;
    const credit = initialQtyById.current.get(sleeveId) ?? 0;
    return sleeve.quantity + credit - qty;
  }

  const usedIds = new Set(value.map((e) => e.sleeveId));
  const availableSleeves = allSleeves.filter((s) => !usedIds.has(s.id));

  function addRow() {
    const s = availableSleeves[0];
    if (!s) return;
    onChange([...value, { sleeveId: s.id, qty: 0 }]);
  }

  function updateSleeve(index: number, sleeveId: number) {
    const next = value.map((e, i) => (i === index ? { ...e, sleeveId } : e));
    onChange(next);
  }

  function updateQty(index: number, qty: number) {
    const next = value.map((e, i) => (i === index ? { ...e, qty } : e));
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {value.map((entry, i) => {
        const sleeve = allSleeves.find((s) => s.id === entry.sleeveId);
        const remaining = remainingFor(entry.sleeveId, entry.qty);
        const negative  = remaining < 0;
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <select
                value={entry.sleeveId}
                onChange={(e) => updateSleeve(i, Number(e.target.value))}
                className="w-44 text-sm"
              >
                {sleeve && (
                  <option value={sleeve.id}>
                    {sleeve.size}{sleeve.label ? ` (${sleeve.label})` : ""}
                  </option>
                )}
                {availableSleeves.concat(sleeve ? [sleeve] : []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.size}{s.label ? ` (${s.label})` : ""} — disp. {s.quantity}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={entry.qty}
                onChange={(e) => updateQty(i, parseInt(e.target.value) || 0)}
                className="w-20 text-sm"
                placeholder="Qtà"
              />
              <span className="text-xs" style={{ color: negative ? "var(--accent-red-light)" : "var(--text-muted)" }}>
                {negative ? `magazzino: ${remaining}` : `rimasti: ${remaining}`}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="btn-ghost p-1.5 rounded ml-auto"
              >
                <Trash2 size={14} style={{ color: "var(--accent-red-light)" }} />
              </button>
            </div>
            {negative && (
              <div className="flex items-center gap-1.5 text-xs pl-1" style={{ color: "var(--accent-red-light)" }}>
                <AlertTriangle size={11} />
                Stai assegnando più bustine di quelle a magazzino — aggiorna la scorta quando le compri.
              </div>
            )}
          </div>
        );
      })}
      {availableSleeves.length > 0 && (
        <button
          type="button"
          onClick={addRow}
          className="btn-ghost text-xs flex items-center gap-1 px-2 py-1"
          style={{ color: "var(--accent-blue-light)" }}
        >
          <Plus size={13} /> Aggiungi formato
        </button>
      )}
      {value.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Nessuna bustina configurata
        </p>
      )}
    </div>
  );
}
