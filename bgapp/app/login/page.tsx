"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/collection");
      router.refresh();
    } else {
      setError("Password errata");
      setPassword("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <svg viewBox="0 0 100 100" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <rect x="12" y="12" width="76" height="76" rx="14" fill="var(--bg-elevated)" stroke="var(--accent-red-light)" strokeWidth="4"/>
              <circle cx="35" cy="35" r="9" fill="var(--accent-red-light)"/>
              <circle cx="65" cy="35" r="9" fill="var(--accent-red-light)"/>
              <circle cx="35" cy="65" r="9" fill="var(--accent-red-light)"/>
              <circle cx="65" cy="65" r="9" fill="var(--accent-red-light)"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>BG Manager</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Collezione giochi da tavolo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Password"
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
            {loading ? <Loader2 size={15} className="animate-spin" /> : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
