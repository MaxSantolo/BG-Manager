"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Loader2, Search, Check, Lock, Unlock, Trash2, Users, LayoutGrid,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useToast } from "@/components/Toast";
import { useIdentity } from "@/components/survey/useIdentity";
import IdentityBar from "@/components/survey/IdentityBar";
import { describeRules, proposeTables, type OptionResult, type TablePlan } from "@/lib/survey";

interface SurveyDetail {
  id: number; title: string; status: string; createdById: number; createdByName: string;
  multiVote: boolean; maxPicks: number | null; proposersCanVoteOwn: boolean;
}
interface BggHit { bggId: number; name: string; year: number | null }

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = Number(params.id);
  const { show } = useToast();
  const [identity, setIdentity] = useIdentity();

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [results, setResults] = useState<OptionResult[]>([]);
  const [myPicks, setMyPicks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [plan, setPlan] = useState<TablePlan | null>(null);
  const initedFor = useRef<number | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ survey: SurveyDetail; results: OptionResult[]; votes: { optionId: number; voterId: number }[] }>(
      `/api/survey/surveys/${surveyId}`);
    if (res.data?.survey) {
      setSurvey(res.data.survey);
      setResults(res.data.results);
      if (identity && initedFor.current !== identity.id) {
        const mine = res.data.votes.filter(v => v.voterId === identity.id).map(v => v.optionId);
        setMyPicks(new Set(mine));
        initedFor.current = identity.id;
      }
    }
    setLoading(false);
  }, [surveyId, identity]);

  useEffect(() => { load(); }, [load]);
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
      if (!survey?.multiVote) next.clear();
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
      if (res.ok && res.data?.results) { setResults(res.data.results); show("Voto registrato"); }
      else show(res.data?.error ?? "Voto non riuscito", "error");
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

  async function removeSurvey() {
    if (!survey || !identity) return;
    if (!confirm("Eliminare il sondaggio? Spariscono proposte e voti.")) return;
    const res = await apiFetch<{ error?: string }>(
      `/api/survey/surveys/${surveyId}?actorId=${identity.id}`, { method: "DELETE" });
    if (res.ok) { show("Sondaggio eliminato"); router.push("/survey"); }
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
    <div className="survey-theme space-y-4 max-w-2xl mx-auto">
      <Link href="/survey" className="btn-ghost text-sm" style={{ color: "var(--accent-blue-light)" }}>
        <ArrowLeft size={14} /> Sondaggi
      </Link>

      {/* Testata con riassunto regole in evidenza */}
      <div className="card space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {!open && <Lock size={16} style={{ color: "var(--text-muted)" }} />}
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{survey.title}</h1>
          </div>
          {iAmCreator && (
            <button type="button" onClick={removeSurvey} className="btn-ghost p-1.5 flex-shrink-0"
              aria-label="Elimina" title="Elimina sondaggio" style={{ color: "var(--accent-red-light)" }}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="badge" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            {survey.multiVote
              ? `Scelte multiple${survey.maxPicks != null ? ` · max ${survey.maxPicks}` : ""}`
              : "Una sola scelta"}
          </span>
          <span className="badge" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            {survey.proposersCanVoteOwn ? "puoi votare i tuoi giochi" : "non voti i tuoi giochi"}
          </span>
          <span className="badge inline-flex items-center gap-1"
            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            <Users size={11} /> {totalVoters}
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>di {survey.createdByName}</p>
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
                      {(opt.minPlayers || opt.maxPlayers) && (
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                          {opt.minPlayers ?? "?"}–{opt.maxPlayers ?? "?"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      propone {opt.proposedByName}{blocked ? " · è tuo" : ""}
                    </p>
                    {opt.voterNames.length > 0 && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--accent-blue-light)" }}>
                        voti: {opt.voterNames.join(", ")}
                      </p>
                    )}
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

      {/* Proposta di divisione in tavoli */}
      {results.some(r => r.votes > 0) && (
        <div className="space-y-2">
          <button type="button" onClick={() => setPlan(proposeTables(results))}
            className="btn-secondary w-full justify-center">
            <LayoutGrid size={15} /> Proponi i tavoli
          </button>
          {plan && <TablesView plan={plan} />}
        </div>
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

/** Mostra la proposta di tavoli + chi resta fuori. */
function TablesView({ plan }: { plan: TablePlan }) {
  return (
    <div className="space-y-2">
      {plan.tables.length === 0 ? (
        <div className="card text-sm" style={{ color: "var(--text-secondary)" }}>
          Non si forma nessun tavolo valido con i voti attuali.
        </div>
      ) : plan.tables.map((t, i) => (
        <div key={i} className="card">
          <div className="flex items-center gap-2">
            {t.gameThumbnail
              ? <img src={t.gameThumbnail} alt="" className="w-9 h-9 object-contain rounded flex-shrink-0" />
              : <div className="w-9 h-9 rounded flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }} />}
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{t.gameName}</span>
            <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>{t.players.length} giocatori</span>
          </div>
          <p className="text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>{t.players.join(", ")}</p>
        </div>
      ))}
      {plan.unseated.length > 0 && (
        <div className="card text-sm" style={{ color: "var(--text-muted)" }}>
          Senza tavolo: {plan.unseated.join(", ")}
        </div>
      )}
      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
        È una proposta automatica dai voti — sistemala a mano come serve.
      </p>
    </div>
  );
}

/** Cerca e proponi un gioco da BoardGameGeek. */
function ProposeGame({ surveyId, identity, onAdded }: {
  surveyId: number; identity: { id: number; name: string } | null; onAdded: () => void;
}) {
  const { show } = useToast();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<BggHit[]>([]);
  const [openPanel, setOpenPanel] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!openPanel) return;
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await apiFetch<{ games: BggHit[] }>(`/api/survey/bgg-search?q=${encodeURIComponent(q)}`);
      setHits(res.data?.games ?? []);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [q, openPanel]);

  async function propose(g: BggHit) {
    if (!identity) { show("Dì prima chi sei.", "error"); return; }
    setAdding(true);
    try {
      const res = await apiFetch<{ id?: number; error?: string }>(`/api/survey/surveys/${surveyId}/options`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedById: identity.id, proposedByName: identity.name,
          bggId: g.bggId, gameName: g.name,
        }),
      });
      if (res.ok) { setQ(""); setHits([]); setOpenPanel(false); onAdded(); show(`"${g.name}" proposto`); }
      else show(res.data?.error ?? "Non riuscito", "error");
    } finally {
      setAdding(false);
    }
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
          placeholder="Cerca su BoardGameGeek…" className="w-full text-sm" />
        <button type="button" onClick={() => { setOpenPanel(false); setQ(""); }}
          className="btn-ghost text-xs" style={{ color: "var(--text-muted)" }}>Chiudi</button>
      </div>
      {adding ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}><Loader2 size={12} className="animate-spin inline" /> aggiungo…</p>
      ) : searching ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}><Loader2 size={12} className="animate-spin inline" /> cerco su BGG…</p>
      ) : q.trim().length < 2 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Scrivi almeno due lettere.</p>
      ) : hits.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nessun gioco su BGG.</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {hits.map(g => (
            <button key={g.bggId} type="button" onClick={() => propose(g)}
              className="flex items-center gap-2 p-1.5 rounded text-left hover:brightness-125"
              style={{ backgroundColor: "var(--bg-elevated)" }}>
              <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{g.name}</span>
              {g.year && <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{g.year}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
