"use client";

import { CircleAlert } from "lucide-react";
import { createContext, use, useCallback, useEffect, useState } from "react";

type Toast = { message: string; tone?: "error"; action?: { label: string; onClick: () => void } };
type Shown = Toast & { id: number; leaving: boolean };

const ToastContext = createContext<(toast: Toast) => void>(() => {});

/** `toast({ message, action })`: satu toast sekaligus; yang baru menggantikan yang lama. */
export const useToast = () => use(ToastContext);

const EXIT_MS = 150;

/**
 * Toast di bawah layar (di atas tab bar HP), masuk dan keluar lewat jalur yang sama.
 * Timer berhenti selama di-hover/difokus agar "Urungkan" sempat dijangkau keyboard.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Shown | null>(null);
  const [paused, setPaused] = useState(false);

  const show = useCallback((next: Toast) => {
    // Toast lama hilang tanpa pointerleave: jangan biarkan jeda tertinggal.
    setPaused(false);
    setToast({ ...next, id: Date.now(), leaving: false });
  }, []);

  useEffect(() => {
    if (!toast || paused || toast.leaving) return;
    const timer = setTimeout(
      () => setToast((t) => (t?.id === toast.id ? { ...t, leaving: true } : t)),
      toast.tone === "error" ? 8000 : toast.action ? 6000 : 4000,
    );
    return () => clearTimeout(timer);
  }, [toast, paused]);

  useEffect(() => {
    if (!toast?.leaving) return;
    const timer = setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), EXIT_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6 lg:pl-64"
      >
        {toast && (
          <div
            key={toast.id}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border bg-popover/90 py-2 pr-2 pl-4 text-sm text-popover-foreground shadow-lg backdrop-blur-xl backdrop-saturate-150 motion-reduce:slide-in-from-bottom-0 motion-reduce:slide-out-to-bottom-0 ${
              toast.leaving
                ? "animate-out fade-out-0 slide-out-to-bottom-2 duration-150 fill-mode-forwards"
                : "animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
            }`}
          >
            {toast.tone === "error" && <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden />}
            <span className={`min-w-0 py-1 break-words select-text ${toast.tone === "error" ? "text-destructive" : ""}`}>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  setToast((t) => (t ? { ...t, leaving: true } : t));
                }}
                className="shrink-0 rounded-md px-2.5 py-1.5 font-medium underline-offset-4 hover:bg-muted active:scale-95 pointer-coarse:py-2.5"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}
