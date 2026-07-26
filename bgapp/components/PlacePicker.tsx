"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Check } from "lucide-react";

interface Place {
  id: number;
  name: string;
  playCount: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Free-text field with suggestions: locations are plain strings on BGG, so a
 * new place must always be typeable — the registry only saves the retyping.
 */
export default function PlacePicker({ value, onChange }: Props) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen]     = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/places")
      .then(r => r.json())
      .then(d => setPlaces(d.places ?? []))
      .catch(() => setPlaces([]));
  }, []);

  // Close when clicking outside, so the list can't cover the rest of the form.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const query = value.trim().toLowerCase();
  const matches = query
    ? places.filter(p => p.name.toLowerCase().includes(query))
    : places;
  const isNew = !!value.trim() && !places.some(p => p.name.toLowerCase() === query);

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-8"
          placeholder="es. Casa Roma"
        />
      </div>

      {open && (matches.length > 0 || isNew) && (
        <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          {matches.map(p => (
            <button key={p.id} type="button"
              onClick={() => { onChange(p.name); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-black/20">
              <MapPin size={12} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
              <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{p.name}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.playCount}</span>
              {p.name === value && <Check size={12} style={{ color: "#4ade80" }} />}
            </button>
          ))}
          {isNew && (
            <div className="px-3 py-2 text-xs border-t"
              style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
              Nuovo luogo: <strong style={{ color: "var(--text-primary)" }}>{value.trim()}</strong> — verrà
              salvato con la partita.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
