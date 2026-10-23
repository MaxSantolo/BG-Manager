"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dices, Plus, Loader2, Vote, Lock } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useToast } from "@/components/Toast";
import { useIdentity } from "@/components/survey/useIdentity";
import IdentityBar from "@/components/survey/IdentityBar";
import { describeRules } from "@/lib/survey";

interface SurveyRow {
  id: number; title: string; status: string; createdByName: string; createdAt: string;
  multiVote: boolean; maxPicks: number | null; proposersCanVoteOwn: boolean;
  _count: { options: number; votes: number };
}

export default function SurveyListPage() {
  const { show } = useToast();
  const [identity, setIdentity] = useIdentity();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [multiVote, setMultiVote] = useState(false);
  const [maxPicks, setMaxPicks] = useState("");
  const [proposersCanVoteOwn, setProposersCanVoteOwn] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await apiFetch<{ surveys: SurveyRow[] }>("/api/survey/surveys");
    setSurveys(res.data?.surveys ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!identity) { show("Dì prima chi sei.", "error"); return; }
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ id: number; error?: string }>("/api/survey/surveys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, createdById: identity.id, createdByName: identity.name,
          multiVote, maxPicks: multiVote ? maxPicks : "", proposersCanVoteOwn,
        }),
      });
      if (res.ok && res.data?.id) {
        setTitle(""); setMultiVote(false); setMaxPicks(""); setProposersCanVoteOwn(false);
        setShowForm(false);
        await load();
        show("Sondaggio creato");
      } else {
        show(res.data?.error ?? "Non riuscito", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="survey-theme space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Dices size={22} style={{ color: "var(--accent-red-light)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Cosa giochiamo?</h1>
      </div>

      <IdentityBar identity={identity} onChange={setIdentity} />

      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary w-full justify-center">
          <Plus size={15} /> Nuovo sondaggio
        </button>
      ) : (
        <div className="card space-y-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titolo (es. Giovedì sera)" className="w-full" autoFocus />

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={multiVote} onChange={e => setMultiVote(e.target.checked)} />
            Scelte multiple
          </label>
          {multiVote && (
            <div className="flex items-center gap-2 text-sm pl-6" style={{ color: "var(--text-secondary)" }}>
              Massimo
              <input type="number" min="1" value={maxPicks} onChange={e => setMaxPicks(e.target.value)}
                placeholder="∞" className="w-20 text-sm" />
              giochi <span style={{ color: "var(--text-muted)" }}>(vuoto = senza limite)</span>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={proposersCanVoteOwn} onChange={e => setProposersCanVoteOwn(e.target.checked)} />
            Chi propone può votare il proprio gioco
          </label>

          <div className="flex gap-2">
            <button type="button" onClick={create} disabled={saving || !title.trim()}
              className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={15} className="animate-spin" /> : "Crea"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annulla</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card text-center" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={18} className="animate-spin inline" />
        </div>
      ) : surveys.length === 0 ? (
        <div className="card text-center" style={{ color: "var(--text-secondary)" }}>
          Ancora nessun sondaggio. Creane uno.
        </div>
      ) : (
        <div className="space-y-2">
          {surveys.map(s => (
            <Link key={s.id} href={`/survey/${s.id}`}
              className="card flex items-center justify-between gap-3 hover:brightness-110 transition"
              style={{ textDecoration: "none" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {s.status === "closed" && <Lock size={13} style={{ color: "var(--text-muted)" }} />}
                  <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{s.title}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  di {s.createdByName} · {describeRules(s)}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span>{s._count.options} giochi</span>
                <span className="inline-flex items-center gap-1"><Vote size={13} /> {s._count.votes}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
