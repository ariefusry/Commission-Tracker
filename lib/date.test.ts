import { describe, expect, it } from "vitest";
import { todayWib } from "./date";

describe("todayWib", () => {
  it("pakai tanggal WIB, bukan UTC", () => {
    // 20:00 UTC 14 Okt = 03:00 WIB 15 Okt
    expect(todayWib(new Date("2026-10-14T20:00:00Z"))).toBe("2026-10-15");
  });

  it("sebelum 17:00 UTC tetap tanggal yang sama", () => {
    expect(todayWib(new Date("2026-10-14T16:59:00Z"))).toBe("2026-10-14");
  });
});
