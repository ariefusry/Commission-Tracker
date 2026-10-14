import { describe, expect, it } from "vitest";
import {
  filterByRange,
  parsePeriod,
  resolveRange,
  revenueSeries,
  summarize,
  typeDistribution,
  weekStart,
  type StatRow,
} from "./stats";

const row = (o: Partial<StatRow>): StatRow => ({
  start_date: "2026-10-01",
  status: "in_progress",
  payment_status: "unpaid",
  dp_amount: 0,
  price_total: 100000,
  type_name: "Halfbody",
  ...o,
});

const today = "2026-10-15"; // Kamis

describe("summarize", () => {
  it("paid → total, dp → nominal DP, cancelled diabaikan", () => {
    const s = summarize([
      row({ payment_status: "paid", price_total: 150000 }),
      row({ payment_status: "dp", dp_amount: 40000, price_total: 100000 }),
      row({ payment_status: "unpaid", price_total: 50000 }),
      row({ status: "cancelled", payment_status: "dp", dp_amount: 30000, price_total: 75000 }),
    ]);
    expect(s).toEqual({ count: 3, cancelled: 1, orderValue: 300000, paid: 190000, cancelledPaid: 0, due: 110000, average: 100000 });
  });

  it("preferensi aktif: DP commission batal masuk 'sudah dibayar', tidak ke nilai order/sisa", () => {
    const s = summarize(
      [
        row({ payment_status: "paid", price_total: 150000 }),
        row({ status: "cancelled", payment_status: "dp", dp_amount: 30000, price_total: 75000 }),
        row({ status: "cancelled", payment_status: "unpaid", price_total: 50000 }),
      ],
      { countCancelledPaid: true },
    );
    expect(s).toMatchObject({ count: 1, cancelled: 2, orderValue: 150000, paid: 180000, cancelledPaid: 30000, due: 0 });
  });

  it("kosong", () => {
    expect(summarize([])).toEqual({ count: 0, cancelled: 0, orderValue: 0, paid: 0, cancelledPaid: 0, due: 0, average: 0 });
  });
});

describe("periode", () => {
  it("minggu mulai Senin", () => {
    expect(weekStart("2026-10-15")).toBe("2026-10-12"); // Kamis → Senin
    expect(weekStart("2026-10-12")).toBe("2026-10-12"); // Senin
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // Minggu
  });

  it("rentang tiap periode", () => {
    expect(resolveRange("week", today)).toEqual({ from: "2026-10-12", to: null });
    expect(resolveRange("month", today)).toEqual({ from: "2026-10-01", to: null });
    expect(resolveRange("3m", today)).toEqual({ from: "2026-08-01", to: null });
    expect(resolveRange("3m", "2026-01-20")).toEqual({ from: "2025-11-01", to: null });
    expect(resolveRange("all", today)).toEqual({ from: null, to: null });
  });

  it("custom: validasi dan tukar jika terbalik", () => {
    expect(resolveRange("custom", today, { from: "2026-10-01", to: "2026-10-07" })).toEqual({ from: "2026-10-01", to: "2026-10-07" });
    expect(resolveRange("custom", today, { from: "2026-10-07", to: "2026-10-01" })).toEqual({ from: "2026-10-01", to: "2026-10-07" });
    expect(resolveRange("custom", today, { from: "bukan-tanggal", to: ["x"] })).toEqual({ from: null, to: null });
  });

  it("filter inklusif di kedua ujung", () => {
    const rows = [row({ start_date: "2026-09-30" }), row({ start_date: "2026-10-01" }), row({ start_date: "2026-10-07" }), row({ start_date: "2026-10-08" })];
    expect(filterByRange(rows, { from: "2026-10-01", to: "2026-10-07" }).map((r) => r.start_date)).toEqual(["2026-10-01", "2026-10-07"]);
  });

  it("parsePeriod default 3m", () => {
    expect(parsePeriod("week")).toBe("week");
    expect(parsePeriod("x")).toBe("3m");
  });
});

describe("revenueSeries", () => {
  it("≤ 31 hari: per hari, hari kosong tetap ada", () => {
    const s = revenueSeries(
      [row({ start_date: "2026-10-13", payment_status: "paid", price_total: 50000 })],
      { from: "2026-10-12", to: null },
      today,
    );
    expect(s.granularity).toBe("day");
    expect(s.points.map((p) => p.label)).toEqual(["12 Okt", "13 Okt", "14 Okt", "15 Okt"]);
    expect(s.points[1]).toMatchObject({ paid: 50000, due: 0 });
  });

  it("> 31 hari: per bulan, dibayar vs belum, cancelled diabaikan", () => {
    const s = revenueSeries(
      [
        row({ start_date: "2026-08-10", payment_status: "paid", price_total: 100000 }),
        row({ start_date: "2026-10-02", payment_status: "dp", dp_amount: 25000, price_total: 100000 }),
        row({ start_date: "2026-10-03", status: "cancelled", payment_status: "paid", price_total: 999 }),
      ],
      { from: "2026-08-01", to: null },
      today,
    );
    expect(s.granularity).toBe("month");
    expect(s.points).toEqual([
      { key: "2026-08", label: "Agu 26", paid: 100000, due: 0 },
      { key: "2026-09", label: "Sep 26", paid: 0, due: 0 },
      { key: "2026-10", label: "Okt 26", paid: 25000, due: 75000 },
    ]);
  });

  it("preferensi aktif: DP commission batal masuk batang dibayar, tanpa sisa", () => {
    const rows = [row({ start_date: "2026-10-13", status: "cancelled", payment_status: "dp", dp_amount: 30000, price_total: 75000 })];
    const range = { from: "2026-10-12", to: null };
    expect(revenueSeries(rows, range, today, { countCancelledPaid: true }).points[1]).toMatchObject({ paid: 30000, due: 0 });
    expect(revenueSeries(rows, range, today).points[1]).toMatchObject({ paid: 0, due: 0 });
  });

  it("semua: mulai dari commission pertama, lintas tahun", () => {
    const s = revenueSeries([row({ start_date: "2025-12-05" })], { from: null, to: null }, "2026-02-01");
    expect(s.points.map((p) => p.key)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("typeDistribution", () => {
  it("urut terbanyak, cancelled diabaikan", () => {
    expect(
      typeDistribution([
        row({ type_name: "Headshot" }),
        row({ type_name: "Halfbody" }),
        row({ type_name: "Halfbody" }),
        row({ type_name: "Full body", status: "cancelled" }),
      ]),
    ).toEqual([
      { type: "Halfbody", count: 2 },
      { type: "Headshot", count: 1 },
    ]);
  });
});
