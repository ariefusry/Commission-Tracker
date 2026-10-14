const DAY_MS = 86_400_000;

/** Hari ini dalam WIB (YYYY-MM-DD), dipakai untuk membandingkan `active_until`. */
export function todayWib(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** Sisa hari langganan, termasuk hari ini. 0 = sudah habis. */
export function daysLeft(activeUntil: string | null, now = new Date()): number {
  if (!activeUntil) return 0;
  const diff = (Date.parse(activeUntil) - Date.parse(todayWib(now))) / DAY_MS;
  return Math.max(0, diff + 1);
}

export function isActive(activeUntil: string | null, now = new Date()): boolean {
  return daysLeft(activeUntil, now) > 0;
}
