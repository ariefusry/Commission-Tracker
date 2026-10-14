/** Hari ini dalam WIB (YYYY-MM-DD). */
export function todayWib(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}
