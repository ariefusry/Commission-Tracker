import { describe, expect, it } from "vitest";
import { daysLeft, isActive, todayWib } from "./subscription";

describe("subscription", () => {
  it("pakai tanggal WIB, bukan UTC", () => {
    // 20:00 UTC 14 Okt = 03:00 WIB 15 Okt
    expect(todayWib(new Date("2026-10-14T20:00:00Z"))).toBe("2026-10-15");
  });

  it("hari terakhir masih aktif, besoknya habis", () => {
    const now = new Date("2026-10-15T05:00:00Z");
    expect(daysLeft("2026-10-15", now)).toBe(1);
    expect(isActive("2026-10-15", now)).toBe(true);
    expect(isActive("2026-10-14", now)).toBe(false);
  });

  it("trial = hari daftar + 6 → 7 hari", () => {
    const now = new Date("2026-10-15T05:00:00Z");
    expect(daysLeft("2026-10-21", now)).toBe(7);
  });

  it("null = tidak aktif", () => {
    expect(daysLeft(null)).toBe(0);
    expect(isActive(null)).toBe(false);
  });
});
