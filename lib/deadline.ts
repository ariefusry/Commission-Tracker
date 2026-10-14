import type { Status } from "@/lib/commission";

const DAY_MS = 86_400_000;

export type DeadlineTone = "late" | "soon" | "normal" | "none";
export type DeadlineInfo = { tone: DeadlineTone; label: string | null };

/** Tanggal lokal perangkat `YYYY-MM-DD`. */
export function localToday(now = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Terlambat = deadline lewat dan status belum done (cancelled juga diabaikan).
 * "soon" = jatuh tempo dalam 3 hari.
 */
export function deadlineInfo(deadline: string | null, status: Status, today: string): DeadlineInfo {
  if (!deadline || status === "done" || status === "cancelled") return { tone: "none", label: null };
  const days = Math.round((Date.parse(deadline) - Date.parse(today)) / DAY_MS);
  if (days < 0) return { tone: "late", label: `Terlambat ${-days} hari` };
  if (days === 0) return { tone: "soon", label: "Hari ini" };
  if (days <= 3) return { tone: "soon", label: `${days} hari lagi` };
  return { tone: "normal", label: `${days} hari lagi` };
}
