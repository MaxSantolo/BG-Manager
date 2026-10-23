"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Dices } from "lucide-react";
import { useT } from "@/components/i18n/LanguageProvider";
import LanguageToggle from "@/components/i18n/LanguageToggle";

export default function SurveyLoginPage() {
  const router = useRouter();
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/survey/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/survey");
      router.refresh();
    } else {
      setError(t("s.wrongPw"));
      setPassword("");
    }
  }

  return (
    <div className="survey-theme min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <Dices size={34} style={{ color: "var(--accent-red-light)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{t("s.title")}</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{t("s.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder={t("s.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-center tracking-widest text-lg"
            autoFocus
            autoComplete="current-password"
          />
          {error && (
            <p className="text-xs text-center" style={{ color: "var(--accent-red-light)" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary w-full justify-center disabled:opacity-40"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : t("s.login")}
          </button>
        </form>
        <div className="flex justify-center"><LanguageToggle /></div>
      </div>
    </div>
  );
}
