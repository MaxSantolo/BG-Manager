"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Loader2, Search, Check, Lock, Unlock } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useToast } from "@/components/Toast";
import { useIdentity } from "@/components/survey/useIdentity";
import IdentityBar from "@/components/survey/IdentityBar";
import { describeRules, type OptionResult } from "@/lib/survey";

interface SurveyDetail {
  id: number; title: string; status: string; createdById: number; createdByName: string;
  multiVote: boolean; maxPicks: number | null; proposersCanVoteOwn: boolean;
}
interface GameHit { id: number; name: string; thumbnail: string | null }

export default function SurveyDetailPage() {
  const params = useParams();
  const surveyId = Number(params.id);
  const { show } = useToast();
  const [identity, setIdentity] = useIdentity();

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [results, setResults] = useState<OptionResult[]>([]);
  const [myPicks, setMyPicks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const initedFor = useRef<number | null>(null); // identità per cui ho già pre-selezionato

  const load = useCallback(async () => {
    const res = await apiFetch<{ survey: SurveyDetail; results: OptionResult[]; votes: { optionId: number; voterId: number }[] }>(
      `/api/survey/surveys/${surveyId}`);
    if (res.data?.survey) {
      setSurvey(res.data.survey);
      setResults(res.data.results);
      // Pre-seleziona le scelte correnti del votante una volta sola per identità,
      // così un refresh live non sovrascrive quello che sta toccando adesso.
      if (identity && initedFor.current !== identity.id) {
        const mine = res.data.votes.filter(v => v.voterId === identity.id).map(v => v.optionId);
        setMyPicks(new Set(mine));
        initedFor.current = identity.id;
      }
    }
    setLoading(false);
  }, [surveyId, identity]);

  useEffect(() => { load(); }, [load]);
  // Risultati live: ricarico ogni 5s (le mie scelte restano, sono stato locale).
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const open = survey?.status === "open";
  const totalVoters = new Set(results.flatMap(r => r.voterNames)).size;
  const maxVotes = Math.max(1, ...results.map(r => r.votes));

  function togglePick(opt: OptionResult) {
    if (!open) return;
    if (identity && !survey?.proposersCanVoteOwn && opt.proposedById === identity.id) return;
    setMyPicks(prev => {
      const next = new Set(prev);
      if (next.has(opt.id)) { next.delete(opt.id); return next; }
      if (!survey?.multiVote) next.clear();               // scelta singola
      if (survey?.multiVote && survey.maxPicks != null && next.size >= survey.maxPicks) {
        show(`Massimo ${survey.maxPicks} scelte.`, "error");
        return prev;
      }
      next.add(opt.id);
      return next;
    });
  }

  async function submitVote() {
    if (!identity) { show("Dì prima chi sei.", "error"); return; }
    setVoting(true);
    try {
      const res = await apiFetch<{ results: OptionResult[]; error?: string }>(
        `/api/survey/surveys/${surveyId}/vote`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voterId: identity.id, voterName: identity.name, optionIds: [...myPicks] }),
        });
      if (res.ok && res.data?.results) {
        setResults(res.data.results);
        show("Voto registrato");
      } else {
        show(res.data?.error ?? "Voto non riuscito", "error");
      }
    } finally {
      setVoting(false);
    }
  }

  async function toggleStatus() {
    if (!survey || !identity) return;
    const next = survey.status === "open" ? "closed" : "open";
    const res = await apiFetch<{ error?: string }>(`/api/survey/surveys/${surveyId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: identity.id, status: next }),
    });
    if (res.ok) { show(next === "closed" ? "Sondaggio chiuso" : "Sondaggio riaperto"); load(); }
    else show(res.data?.error ?? "Non riuscito", "error");
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto"><div className="card text-center" style={{ color: "var(--text-muted)" }}>
      <Loader2 size={18} className="animate-spin inline" /></div></div>;
  }
  if (!survey) {
    return <div className="max-w-2xl mx-auto space-y-3">
      <Link href="/survey" className="btn-ghost text-sm"><ArrowLeft size={14} /> Sondaggi</Link>
      <div className="card text-center" style={{ color: "var(--text-secondary)" }}>Sondaggio non trovato.</div>
    </div>;
  }

  const iAmCreator = identity?.id === survey.createdById;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link href="/survey" className="btn-ghost text-sm" style={{ color: "var(--accent-blue-light)" }}>
        <ArrowLeft size={14} /> Sondaggi
      </Link>

      <div>
        <div className="flex items-center gap-2">
          {!open && <Lock size={16} style={{ color: "var(--text-muted)" }} />}
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{survey.title}</h1>
        </div>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          di {survey.createdByName} · {describeRules(survey)} · {totalVoters} votanti
        </p>
      </div>

      <IdentityBar identity={identity} onChange={setIdentity} />

      {open && <ProposeGame surveyId={surveyId} identity={identity} onAdded={load} />}

      {results.length === 0 ? (
        <div className="card text-center" style={{ color: "var(--text-secondary)" }}>
          Nessun gioco proposto. {open ? "Aggiungine uno." : ""}
        </div>
      ) : (
        <div className="space-y-2">
          {results.map(opt => {
            const picked = myPicks.has(opt.id);
            const mine = identity != null && opt.proposedById === identity.id;
            const blocked = mine && !survey.proposersCanVoteOwn;
            return (
              <button key={opt.id} type="button" onClick={() => togglePick(opt)}
                disabled={!open || blocked}
                className="card w-full text-left relative overflow-hidden"
                style={{ cursor: open && !blocked ? "pointer" : "default",
                  borderColor: picked ? "var(--accent-red)" : undefined,
                  borderWidth: picked ? 2 : undefined }}>
                {/* barra risultati live */}
                <div className="absolute inset-y-0 left-0" style={{
                  width: `${(opt.votes / maxVotes) * 100}%`,
                  backgroundColor: "var(--bg-elevated)", opacity: 0.5, zIndex: 0 }} />
                <div className="relative flex items-center gap-3" style={{ zIndex: 1 }}>
                  {opt.gameThumbnail
                    ? <img src={opt.gameThumbnail} alt="" className="w-11 h-11 object-contain rounded flex-shrink-0" />
                    : <div className="w-11 h-11 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {picked && <Check size={15} style={{ color: "var(--accent-red-light)" }} />}
                      <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{opt.gameName}</span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      propone {opt.proposedByName}{blocked ? " · è tuo" : ""}
                      {opt.voterNames.length > 0 && ` · ${opt.voterNames.join(", ")}`}
                    </p>
                  </div>
                  <span className="text-lg font-bold flex-shrink-0 tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {opt.votes}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && results.length > 0 && (
        <button type="button" onClick={submitVote} disabled={voting || !identity}
          className="btn-primary w-full justify-center sticky bottom-4">
          {voting ? <Loader2 size={15} className="animate-spin" />
            : myPicks.size === 0 ? "Annulla il mio voto" : `Vota (${myPicks.size})`}
        </button>
      )}

      {iAmCreator && (
        <button type="button" onClick={toggleStatus} className="btn-ghost text-sm w-full justify-center"
          style={{ color: "var(--text-muted)" }}>
          {survey.status === "open" ? <><Lock size={13} /> Chiudi sondaggio</> : <><Unlock size={13} /> Riapri</>}
        </button>
      )}
    </div>
  );
}

/** Ricerca e proponi un gioco dalla collezione. */
function ProposeGame({ surveyId, identity, onAdded }: {
  surveyId: number; identity: { id: number; name: string } | null; onAdded: () => void;
}) {
  const { show } = useToast();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GameHit[]>([]);
  const [openPanel, setOpenPanel] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!openPanel) return;
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await apiFetch<{ games: GameHit[] }>(`/api/survey/games?q=${encodeURIComponent(q)}`);
      setHits(res.data?.games ?? []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, openPanel]);

  async function propose(g: GameHit) {
    if (!identity) { show("Dì prima chi sei.", "error"); return; }
    const res = await apiFetch<{ id?: number; error?: string }>(`/api/survey/surveys/${surveyId}/options`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposedById: identity.id, proposedByName: identity.name,
        gameId: g.id, gameName: g.name, gameThumbnail: g.thumbnail,
      }),
    });
    if (res.ok) { setQ(""); setHits([]); setOpenPanel(false); onAdded(); show(`"${g.name}" proposto`); }
    else show(res.data?.error ?? "Non riuscito", "error");
  }

  if (!openPanel) {
    return (
      <button type="button" onClick={() => setOpenPanel(true)} className="btn-secondary w-full justify-center">
        <Plus size={15} /> Proponi un gioco
      </button>
    );
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center gap-2">
        <Search size={15} style={{ color: "var(--text-muted)" }} />
        <input type="text" value={q} onChange={e => setQ(e.target.value)} autoFocus
          placeholder="Cerca nella collezione…" className="w-full text-sm" />
        <button type="button" onClick={() => { setOpenPanel(false); setQ(""); }}
          className="btn-ghost text-xs" style={{ color: "var(--text-muted)" }}>Chiudi</button>
      </div>
      {searching ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}><Loader2 size={12} className="animate-spin inline" /> cerco…</p>
      ) : hits.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nessun gioco.</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {hits.map(g => (
            <button key={g.id} type="button" onClick={() => propose(g)}
              className="flex items-center gap-2 p-1.5 rounded text-left hover:brightness-125"
              style={{ backgroundColor: "var(--bg-elevated)" }}>
              {g.thumbnail
                ? <img src={g.thumbnail} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                : <div className="w-8 h-8 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-card)" }} />}
              <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{g.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
