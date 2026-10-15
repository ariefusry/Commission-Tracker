import { STATUSES, type PaymentStatus, type Status } from "@/lib/commission";
import { todayWib } from "@/lib/date";
import { deadlineInfo } from "@/lib/deadline";
import { amountDue, amountPaid } from "@/lib/pricing";

// Statistik dashboard. Commission `cancelled` tidak dihitung ke nilai order / sisa tagihan.
// Uang yang sudah diterima dari commission batal (DP yang tidak dikembalikan) ikut
// dihitung sebagai "sudah dibayar" jika preferensi user `countCancelledPaid` aktif.
// Semua tanggal berupa string `YYYY-MM-DD` dan periode memakai tanggal mulai.

export type StatRow = {
  start_date: string;
  status: Status;
  payment_status: PaymentStatus;
  dp_amount: number;
  price_total: number;
  type_name: string;
};

export const PERIODS = ["week", "month", "3m", "all", "custom"] as const;
export type Period = (typeof PERIODS)[number];

export const parsePeriod = (v: unknown): Period => (PERIODS.includes(v as Period) ? (v as Period) : "3m");

/** Rentang inklusif; null = tanpa batas. */
export type DateRange = { from: string | null; to: string | null };

const DAY_MS = 86_400_000;

export const isIsoDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(date) + n * DAY_MS).toISOString().slice(0, 10);
}

const monthKey = (date: string) => date.slice(0, 7);

function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** Senin minggu ini. */
export function weekStart(today: string): string {
  const dow = new Date(Date.parse(today)).getUTCDay(); // 0 = Minggu
  return addDays(today, -((dow + 6) % 7));
}

export function resolveRange(period: Period, today: string, custom: { from?: unknown; to?: unknown } = {}): DateRange {
  switch (period) {
    case "week":
      return { from: weekStart(today), to: null };
    case "month":
      return { from: `${monthKey(today)}-01`, to: null };
    case "3m":
      return { from: `${addMonths(monthKey(today), -2)}-01`, to: null };
    case "all":
      return { from: null, to: null };
    case "custom": {
      const from = isIsoDate(custom.from) ? custom.from : null;
      const to = isIsoDate(custom.to) ? custom.to : null;
      return from && to && from > to ? { from: to, to: from } : { from, to };
    }
  }
}

export function filterByRange<T extends { start_date: string }>(rows: T[], { from, to }: DateRange): T[] {
  return rows.filter((r) => (!from || r.start_date >= from) && (!to || r.start_date <= to));
}

export type StatOptions = { countCancelledPaid: boolean };
const DEFAULT_OPTIONS: StatOptions = { countCancelledPaid: false };

const counted = (rows: StatRow[]) => rows.filter((r) => r.status !== "cancelled");
const paidOf = (r: StatRow) => amountPaid(r.price_total, r.payment_status, r.dp_amount);
/** Uang dari commission batal yang dihitung masuk (0 jika preferensi mati). */
const cancelledPaidOf = (r: StatRow, o: StatOptions) => (o.countCancelledPaid && r.status === "cancelled" ? paidOf(r) : 0);

export function summarize(rows: StatRow[], options: StatOptions = DEFAULT_OPTIONS) {
  const active = counted(rows);
  const orderValue = active.reduce((s, r) => s + r.price_total, 0);
  const activePaid = active.reduce((s, r) => s + paidOf(r), 0);
  const cancelledPaid = rows.reduce((s, r) => s + cancelledPaidOf(r, options), 0);
  return {
    count: active.length,
    cancelled: rows.length - active.length,
    orderValue,
    paid: activePaid + cancelledPaid,
    cancelledPaid,
    due: orderValue - activePaid,
    average: active.length ? Math.round(orderValue / active.length) : 0,
  };
}

/** key = `YYYY-MM-DD` (harian) atau `YYYY-MM` (bulanan); label sumbu lewat formatPeriodKey. */
export type SeriesPoint = { key: string; paid: number; due: number; count: number };
const MAX_DAILY_POINTS = 31;

/**
 * Pendapatan dibayar vs belum per hari (rentang ≤ 31 hari) atau per bulan.
 * Hari/bulan kosong tetap muncul agar sumbu waktu tidak melompat.
 */
export function revenueSeries(rows: StatRow[], range: DateRange, today: string, options: StatOptions = DEFAULT_OPTIONS) {
  const end = range.to ?? today;
  const start = range.from ?? rows.reduce((min, r) => (r.start_date < min ? r.start_date : min), end);
  const daily = (Date.parse(end) - Date.parse(start)) / DAY_MS + 1 <= MAX_DAILY_POINTS;

  const points: SeriesPoint[] = [];
  if (daily) {
    for (let d = start; d <= end; d = addDays(d, 1)) {
      points.push({ key: d, paid: 0, due: 0, count: 0 });
    }
  } else {
    for (let k = monthKey(start); k <= monthKey(end); k = addMonths(k, 1)) {
      points.push({ key: k, paid: 0, due: 0, count: 0 });
    }
  }

  const byKey = new Map(points.map((p) => [p.key, p]));
  for (const r of rows) {
    const p = byKey.get(daily ? r.start_date : monthKey(r.start_date));
    if (!p) continue;
    if (r.status === "cancelled") {
      p.paid += cancelledPaidOf(r, options);
      continue;
    }
    const paid = paidOf(r);
    p.count += 1;
    p.paid += paid;
    p.due += r.price_total - paid;
  }
  return { granularity: daily ? ("day" as const) : ("month" as const), points };
}

/** Jumlah dan nilai order per tipe (tanpa cancelled), urut terbanyak. */
export function typeDistribution(rows: StatRow[]) {
  const totals = new Map<string, { count: number; revenue: number }>();
  for (const r of counted(rows)) {
    const t = totals.get(r.type_name) ?? { count: 0, revenue: 0 };
    totals.set(r.type_name, { count: t.count + 1, revenue: t.revenue + r.price_total });
  }
  return [...totals]
    .map(([type, t]) => ({ type, ...t }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

/**
 * Periode pembanding: panjang sama, tepat sebelum `range`. null untuk "semua".
 * Rentang terbuka (to = null) dihitung sampai hari ini.
 */
export function previousRange(range: DateRange, today: string): DateRange | null {
  if (!range.from) return null;
  const days = (Date.parse(range.to ?? today) - Date.parse(range.from)) / DAY_MS + 1;
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}

/** Perubahan dalam persen (dibulatkan); null jika pembanding 0 (tidak bermakna). */
export function percentChange(current: number, previous: number): number | null {
  return previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
}

export function statusCounts(rows: { status: Status }[]): Record<Status, number> {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const r of rows) counts[r.status]++;
  return counts;
}

type WorkRow = { start_date: string; deadline: string | null; status: Status; completed_at: string | null };

/** Commission selesai: rata-rata hari kerja (mulai → selesai, WIB) dan % selesai ≤ deadline. */
export function workPace(rows: WorkRow[]) {
  const finished = rows
    .filter((r) => r.status === "done" && r.completed_at)
    .map((r) => ({ ...r, finished: todayWib(new Date(r.completed_at!)) }));
  const withDeadline = finished.filter((r) => r.deadline);
  const days = finished.map((r) => Math.max(0, (Date.parse(r.finished) - Date.parse(r.start_date)) / DAY_MS));
  return {
    done: finished.length,
    avgDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    onTimePct: withDeadline.length
      ? Math.round((withDeadline.filter((r) => r.finished <= r.deadline!).length / withDeadline.length) * 100)
      : null,
  };
}

/**
 * Yang perlu ditindaklanjuti sekarang (semua periode): terlambat, deadline ≤ 3 hari,
 * dan sudah selesai tapi belum lunas. Urut deadline / tanggal terdekat.
 */
export function needsAttention<T extends StatRow & { deadline: string | null }>(rows: T[], today: string) {
  const tone = (r: T) => deadlineInfo(r.deadline, r.status, today).tone;
  const byDeadline = (a: T, b: T) => (a.deadline ?? "").localeCompare(b.deadline ?? "");
  return {
    late: rows.filter((r) => tone(r) === "late").sort(byDeadline),
    soon: rows.filter((r) => tone(r) === "soon").sort(byDeadline),
    unpaid: rows
      .filter((r) => r.status === "done" && amountDue(r.price_total, r.payment_status, r.dp_amount) > 0)
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
  };
}
