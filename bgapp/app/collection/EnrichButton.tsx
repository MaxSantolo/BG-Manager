"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EnrichButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ enriched: number; remaining: number } | null>(null);

  async function enrich() {
    setRunning(true);
    setResult(null);
    const res = await fetch("/api/bgg/enrich", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      router.refresh();
    }
    setRunning(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={enrich} disabled={running} className="btn-secondary text-sm">
        {running
          ? <><Loader2 size={14} className="animate-spin" /> Enriching BGG…</>
          : <><Sparkles size={14} /> Enrich da BGG</>
        }
      </button>
      {result && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          ✓ {result.enriched} aggiornati
          {result.remaining > 0 && ` · ${result.remaining} rimasti`}
        </span>
      )}
    </div>
  );
}
