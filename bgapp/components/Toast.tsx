"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";
interface ToastItem { id: number; message: string; type: ToastType }
interface ToastCtx { show: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="safe-fixed-bottom fixed right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium pointer-events-auto"
            style={{
              backgroundColor: t.type === "success" ? "#14532d" : "var(--accent-red)",
              color: "white",
              border: `1px solid ${t.type === "success" ? "#166534" : "var(--accent-red-hover)"}`,
              animation: "slideIn 0.2s ease-out",
            }}
          >
            {t.type === "success" ? <CheckCircle size={15} /> : <XCircle size={15} />}
            <span>{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
