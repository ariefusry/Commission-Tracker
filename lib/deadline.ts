import type { Status } from "@/lib/commission";
import type { Dict } from "@/lib/i18n";

const DAY_MS = 86_400_000;

export type DeadlineTone = "late" | "soon" | "normal" | "none";
/** days = sisa hari (negatif = terlambat); null jika tidak relevan. */
export type DeadlineInfo = { tone: DeadlineTone; days: number | null };

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
  if (!deadline || status === "done" || status === "cancelled") return { tone: "none", days: null };
  const days = Math.round((Date.parse(deadline) - Date.parse(today)) / DAY_MS);
  return { tone: days < 0 ? "late" : days <= 3 ? "soon" : "normal", days };
}

export function deadlineLabel({ days }: DeadlineInfo, t: Dict): string | null {
  if (days === null) return null;
  return days < 0 ? t.deadline.late(-days) : days === 0 ? t.deadline.today : t.deadline.left(days);
}
