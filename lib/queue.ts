import { addDays } from "@/lib/stats";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 90; // hanya kecepatan kerja 90 hari terakhir yang relevan
const MIN_SAMPLES = 3; // di bawah ini perkiraan tidak ditampilkan
const SPREAD = 0.25; // rentang ±25%: ini perkiraan, bukan janji

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

/**
 * Rata-rata hari per commission selesai (throughput artist), dari tanggal selesai terbaru.
 * null jika data kurang dari MIN_SAMPLES dalam WINDOW_DAYS terakhir.
 */
export function daysPerCommission(recentCompletions: string[], today: string): number | null {
  const recent = recentCompletions.filter((d) => daysBetween(d, today) <= WINDOW_DAYS && d <= today);
  if (recent.length < MIN_SAMPLES) return null;
  const oldest = recent.reduce((min, d) => (d < min ? d : min));
  return Math.max(1, daysBetween(oldest, today) / recent.length);
}

/**
 * Perkiraan rentang tanggal selesai untuk commission di posisi antrean `position`
 * (1 = sedang paling depan). Antrean dikerjakan berurutan (pesan duluan, selesai duluan).
 */
export function estimateFinish(position: number, recentCompletions: string[], today: string) {
  const pace = daysPerCommission(recentCompletions, today);
  if (pace === null || position < 1) return null;
  const days = position * pace;
  return {
    from: addDays(today, Math.max(1, Math.round(days * (1 - SPREAD)))),
    to: addDays(today, Math.max(1, Math.round(days * (1 + SPREAD)))),
    pace,
  };
}
