import { describe, expect, it } from "vitest";
import { activeFilterCount, applyFilter, EMPTY_FILTER } from "./commission-filter";

type R = Parameters<typeof applyFilter>[0][number];
const row = (o: Partial<R>): R => ({
  client_username: "kiki",
  type_name: "Halfbody",
  start_date: "2026-10-01",
  deadline: null,
  status: "in_progress",
  payment_status: "unpaid",
  price_total: 100000,
  ...o,
});

const rows = [
  row({ client_username: "Mochi_Draws", start_date: "2026-08-01", deadline: "2026-10-20", price_total: 50000, status: "done", payment_status: "paid" }),
  row({ client_username: "aya", start_date: "2026-09-15", deadline: "2026-10-18", price_total: 200000, type_name: "Full body" }),
  row({ client_username: "zen", start_date: "2026-10-05", deadline: null, price_total: 150000, payment_status: "dp" }),
];
const names = (r: R[]) => r.map((x) => x.client_username);

describe("applyFilter", () => {
  it("search username tanpa peduli huruf besar", () => {
    expect(names(applyFilter(rows, { ...EMPTY_FILTER, q: "mochi" }, "newest"))).toEqual(["Mochi_Draws"]);
  });

  it("filter status, bayar, tipe", () => {
    expect(names(applyFilter(rows, { ...EMPTY_FILTER, status: "done" }, "newest"))).toEqual(["Mochi_Draws"]);
    expect(names(applyFilter(rows, { ...EMPTY_FILTER, payment: "dp" }, "newest"))).toEqual(["zen"]);
    expect(names(applyFilter(rows, { ...EMPTY_FILTER, type: "Full body" }, "newest"))).toEqual(["aya"]);
  });

  it("rentang tanggal mulai inklusif", () => {
    expect(names(applyFilter(rows, { ...EMPTY_FILTER, from: "2026-09-15", to: "2026-10-05" }, "newest"))).toEqual(["zen", "aya"]);
  });

  it("sort", () => {
    expect(names(applyFilter(rows, EMPTY_FILTER, "deadline"))).toEqual(["aya", "Mochi_Draws", "zen"]);
    expect(names(applyFilter(rows, EMPTY_FILTER, "total"))).toEqual(["aya", "zen", "Mochi_Draws"]);
    expect(names(applyFilter(rows, EMPTY_FILTER, "client"))).toEqual(["aya", "Mochi_Draws", "zen"]);
  });

  it("tidak mengubah array asli", () => {
    const copy = [...rows];
    applyFilter(rows, EMPTY_FILTER, "total");
    expect(rows).toEqual(copy);
  });

  it("hitung filter aktif", () => {
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTER, q: "a", type: "x" })).toBe(2);
  });
});
