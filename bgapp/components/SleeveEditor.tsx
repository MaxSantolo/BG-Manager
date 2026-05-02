"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

interface Sleeve {
  id: number;
  size: string;
  label?: string;
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
  useEffect(() => {
    fetch("/api/sleeves/all")
      .then((res) => res.json())
      .then((data) => setAllSleeves(Array.isArray(data) ? data : []));
  }, []);

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
        return (
          <div key={i} className="flex items-center gap-2">
            <select
              value={entry.sleeveId}
              onChange={(e) => updateSleeve(i, Number(e.target.value))}
              className="w-40 text-sm"
            >
              {sleeve && (
                <option value={sleeve.id}>
                  {sleeve.size}{sleeve.label ? ` (${sleeve.label})` : ""}
                </option>
              )}
              {availableSleeves.concat(sleeve ? [sleeve] : []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.size}{s.label ? ` (${s.label})` : ""}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={entry.qty}
              onChange={(e) => updateQty(i, parseInt(e.target.value) || 0)}
              className="w-20 text-sm"
              placeholder="Qtà"
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              pz
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="btn-ghost p-1.5 rounded"
            >
              <Trash2 size={14} style={{ color: "var(--accent-red-light)" }} />
            </button>
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
