"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, Vote, Lock, CalendarDays, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import { useToast } from "@/components/Toast";
import { useIdentity } from "@/components/survey/useIdentity";
import IdentityBar from "@/components/survey/IdentityBar";
import SurveyLogo from "@/components/survey/SurveyLogo";
import { useT } from "@/components/i18n/LanguageProvider";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { formatDay, todayInput } from "@/lib/dates";

interface SurveyRow {
  id: number; title: string; status: string; createdByName: string; createdAt: string;
  playDate: string | null; multiVote: boolean; maxPicks: number | null;
  proposersCanVoteOwn: boolean; winnersCount: number | null;
  _count: { options: number; votes: number };
}

export default function SurveyListPage() {
  const { show } = useToast();
  const { t } = useT();
  const [identity, setIdentity] = useIdentity();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [playDate, setPlayDate] = useState("");
  const [multiVote, setMultiVote] = useState(false);
  const [maxPicks, setMaxPicks] = useState("");
  const [winnersCount, setWinnersCount] = useState("");
  const [proposersCanVoteOwn, setProposersCanVoteOwn] = useState(false);
  const [secret, setSecret] = useState(false);
  const [closeAfterVoters, setCloseAfterVoters] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [saving, setSaving] = useState(false);

  const rulesText = (r: SurveyRow) =>
    `${r.multiVote ? t("s.multiChoice") + (r.maxPicks != null ? ` (${t("s.max").toLowerCase()} ${r.maxPicks})` : "") : t("s.oneChoice")} · ${r.proposersCanVoteOwn ? t("s.canVoteOwn") : t("s.cantVoteOwn")}`;

  async function load() {
    const res = await apiFetch<{ surveys: SurveyRow[] }>("/api/survey/surveys");
    setSurveys(res.data?.surveys ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!identity) { show(t("common.who"), "error"); return; }
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ id: number; error?: string }>("/api/survey/surveys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, createdById: identity.id, createdByName: identity.name, playDate,
          multiVote, maxPicks: multiVote ? maxPicks : "", winnersCount, proposersCanVoteOwn,
          secret, closeAfterVoters,
          // il browser (fuso dell'utente) converte il datetime-local in istante UTC
          closeAt: closeAt ? new Date(closeAt).toISOString() : "",
        }),
      });
      if (res.ok && res.data?.id) {
        setTitle(""); setPlayDate(""); setMultiVote(false); setMaxPicks("");
        setWinnersCount(""); setProposersCanVoteOwn(false);
        setSecret(false); setCloseAfterVoters(""); setCloseAt("");
        setShowForm(false);
        await load();
        show(t("s.created"));
      } else {
        show(res.data?.error ?? t("s.notDone"), "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="survey-theme space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <SurveyLogo size={30} />
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{t("s.title")}</h1>
        <div className="ml-auto"><LanguageToggle compact /></div>
      </div>

      <IdentityBar identity={identity} onChange={setIdentity} />

      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary w-full justify-center">
          <Plus size={15} /> {t("s.newPoll")}
        </button>
      ) : (
        <div className="card space-y-3">
          <div className="flex gap-2">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t("s.pollTitle")} className="flex-1 min-w-0" autoFocus />
            <input type="date" value={playDate} min={todayInput()} onChange={e => setPlayDate(e.target.value)}
              className="text-sm flex-shrink-0" title={t("s.whenPlay")} />
          </div>

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={multiVote} onChange={e => setMultiVote(e.target.checked)} />
            {t("s.multi")}
          </label>
          {multiVote && (
            <div className="flex items-center gap-2 text-sm pl-6" style={{ color: "var(--text-secondary)" }}>
              {t("s.max")}
              <input type="number" min="1" value={maxPicks} onChange={e => setMaxPicks(e.target.value)}
                placeholder="∞" className="w-20 text-sm" />
              {t("s.games")} <span style={{ color: "var(--text-muted)" }}>{t("s.noLimit")}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <Trophy size={14} style={{ color: "var(--accent-red-light)" }} /> {t("s.winners")}
            <input type="number" min="1" value={winnersCount} onChange={e => setWinnersCount(e.target.value)}
              placeholder={t("s.winnersBadge")} className="w-20 text-sm" />
            <span style={{ color: "var(--text-muted)" }}>{t("s.winnersHint")}</span>
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={proposersCanVoteOwn} onChange={e => setProposersCanVoteOwn(e.target.checked)} />
            {t("s.proposersVote")}
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={secret} onChange={e => setSecret(e.target.checked)} />
            {t("s.secret")} <span style={{ color: "var(--text-muted)" }}>{t("s.secretHint")}</span>
          </label>

          <div className="pt-1 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold mt-1" style={{ color: "var(--text-muted)" }}>{t("s.autoClose")}</p>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              {t("s.closeAtVoters")}
              <input type="number" min="1" value={closeAfterVoters} onChange={e => setCloseAfterVoters(e.target.value)}
                placeholder="—" className="w-20 text-sm" />
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "var(--text-secondary)" }}>
              {t("s.closeAtDate")}
              <input type="datetime-local" value={closeAt} onChange={e => setCloseAt(e.target.value)} className="text-sm" />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={create} disabled={saving || !title.trim()}
              className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={15} className="animate-spin" /> : t("common.create")}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t("common.cancel")}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card text-center" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={18} className="animate-spin inline" />
        </div>
      ) : surveys.length === 0 ? (
        <div className="card text-center" style={{ color: "var(--text-secondary)" }}>
          {t("s.noPolls")}
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
                <p className="text-xs mt-0.5 flex items-center gap-1 flex-wrap" style={{ color: "var(--text-muted)" }}>
                  {s.playDate && <span className="inline-flex items-center gap-1" style={{ color: "var(--accent-blue-light)" }}>
                    <CalendarDays size={11} /> {formatDay(s.playDate)}</span>}
                  <span>{t("s.of")} {s.createdByName} · {rulesText(s)}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span>{s._count.options} {t("s.gamesCount")}</span>
                <span className="inline-flex items-center gap-1"><Vote size={13} /> {s._count.votes}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
