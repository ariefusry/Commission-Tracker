import type { PaymentStatus, Status } from "@/lib/commission";
import { amountPaid } from "@/lib/pricing";

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
export const PERIOD_LABEL: Record<Period, string> = {
  week: "Minggu ini",
  month: "Bulan ini",
  "3m": "3 bulan",
  all: "Semua",
  custom: "Pilih tanggal",
};
export const PERIOD_SHORT: Record<Period, string> = {
  week: "Minggu",
  month: "Bulan",
  "3m": "3 bln",
  all: "Semua",
  custom: "Tanggal",
};

export const parsePeriod = (v: unknown): Period => (PERIODS.includes(v as Period) ? (v as Period) : "3m");

/** Rentang inklusif; null = tanpa batas. */
export type DateRange = { from: string | null; to: string | null };

const DAY_MS = 86_400_000;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

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

export type SeriesPoint = { key: string; label: string; paid: number; due: number };
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
      points.push({ key: d, label: `${Number(d.slice(8))} ${MONTH_SHORT[Number(d.slice(5, 7)) - 1]}`, paid: 0, due: 0 });
    }
  } else {
    for (let k = monthKey(start); k <= monthKey(end); k = addMonths(k, 1)) {
      points.push({ key: k, label: `${MONTH_SHORT[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`, paid: 0, due: 0 });
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
    p.paid += paid;
    p.due += r.price_total - paid;
  }
  return { granularity: daily ? ("day" as const) : ("month" as const), points };
}

export function typeDistribution(rows: StatRow[]) {
  const counts = new Map<string, number>();
  for (const r of counted(rows)) counts.set(r.type_name, (counts.get(r.type_name) ?? 0) + 1);
  return [...counts]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}
