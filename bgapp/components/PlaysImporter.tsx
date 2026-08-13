"use client";

import { useState } from "react";
import { Download, Loader2, X, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetchClient";

interface Props {
  initialUsername?: string;
}

type Status = "idle" | "loading" | "done" | "error";

export default function PlaysImporter({ initialUsername }: Props) {
  const hasSaved = !!initialUsername?.trim();

  const [open, setOpen]         = useState(false);
  const [username, setUsername] = useState(initialUsername ?? "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [status, setStatus]     = useState<Status>("idle");
  const [message, setMessage]   = useState("");

  async function runImport(u: string, p: string) {
    setStatus("loading");
    setMessage("Importazione in corso… (può richiedere qualche secondo)");
    const res = await apiFetch<{ error?: string; imported?: number }>("/api/plays/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u.trim(), password: p }),
    }, 90000);

    if (res.timedOut) {
      setStatus("error");
      setMessage("Importazione lenta o interrotta. Riprova o ricarica per vedere cosa è stato importato.");
      return;
    }
    if (res.networkError) {
      setStatus("error");
      setMessage("Connessione assente. Riprova.");
      return;
    }
    const data = res.data ?? {};
    if (!res.ok || data.error) {
      setStatus("error");
      setMessage(data.error ?? "Errore durante l'importazione");
      return;
    }
    setStatus("done");
    setMessage(`${data.imported ?? 0} partite importate.`);
  }

  function startClick() {
    setOpen(true);
    if (hasSaved) runImport(initialUsername!, "");
  }

  function close() {
    setOpen(false);
    setStatus("idle");
    setMessage("");
    if (!hasSaved) setPassword("");
  }

  return (
    <>
      <button onClick={startClick} className="btn-primary text-sm flex items-center gap-2">
        <Download size={14} /> Importa da BGG
      </button>

      {open && (
        <div className="modal-shell fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="w-full max-w-sm rounded-xl shadow-2xl"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>

            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Importa partite da BGG</span>
              <button onClick={close} className="btn-ghost p-1.5">
                <X size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {!hasSaved && (
                <>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Inserisci le credenziali, oppure salvale nelle <Link href="/settings" className="underline" style={{ color: "var(--accent-blue-light)" }}>impostazioni</Link> per non doverle reinserire.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                      style={{ color: "var(--text-secondary)" }}>Username BGG</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="es. MaxSantolo" className="w-full"
                      disabled={status === "loading"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                      style={{ color: "var(--text-secondary)" }}>Password BGG</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pr-9"
                        disabled={status === "loading"}
                        onKeyDown={e => e.key === "Enter" && username.trim() && runImport(username, password)}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-ghost p-0.5">
                        {showPw
                          ? <EyeOff size={14} style={{ color: "var(--text-muted)" }} />
                          : <Eye size={14} style={{ color: "var(--text-muted)" }} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {status === "loading" && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  <Loader2 size={15} className="animate-spin flex-shrink-0" />
                  {message}
                </div>
              )}
              {status === "done" && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#4ade80" }}>
                  <CheckCircle size={15} className="flex-shrink-0" /> {message}
                </div>
              )}
              {status === "error" && (
                <div className="flex items-start gap-2 text-sm" style={{ color: "var(--accent-red-light)" }}>
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {message}
                </div>
              )}
            </div>

            <div className="flex gap-2 p-4 border-t" style={{ borderColor: "var(--border)" }}>
              {status === "done" ? (
                <button onClick={() => { close(); window.location.reload(); }} className="btn-primary flex-1">
                  Fatto
                </button>
              ) : hasSaved ? (
                <button onClick={close} className="btn-secondary flex-1" disabled={status === "loading"}>
                  {status === "loading" ? "Attendi…" : "Chiudi"}
                </button>
              ) : (
                <>
                  <button onClick={() => runImport(username, password)}
                    disabled={status === "loading" || !username.trim()}
                    className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {status === "loading"
                      ? <><Loader2 size={14} className="animate-spin" /> In corso…</>
                      : <><Download size={14} /> Importa</>}
                  </button>
                  <button onClick={close} className="btn-secondary">Annulla</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
