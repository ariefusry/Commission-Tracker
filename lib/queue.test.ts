import { describe, expect, it } from "vitest";
import { daysPerCommission, estimateFinish } from "./queue";

const today = "2026-10-15";

describe("daysPerCommission", () => {
  it("3 selesai dalam 30 hari → 10 hari per commission", () => {
    expect(daysPerCommission(["2026-10-10", "2026-09-25", "2026-09-15"], today)).toBe(10);
  });

  it("kurang dari 3 data → null", () => {
    expect(daysPerCommission(["2026-10-10", "2026-09-25"], today)).toBeNull();
  });

  it("data lebih dari 90 hari diabaikan", () => {
    expect(daysPerCommission(["2026-10-10", "2026-09-25", "2026-06-01"], today)).toBeNull();
  });

  it("minimal 1 hari walau banyak selesai di hari yang sama", () => {
    expect(daysPerCommission([today, today, today, today], today)).toBe(1);
  });
});

describe("estimateFinish", () => {
  const recent = ["2026-10-10", "2026-09-25", "2026-09-15"]; // 10 hari/commission

  it("posisi 3 → sekitar 30 hari, rentang ±25%", () => {
    expect(estimateFinish(3, recent, today)).toEqual({ from: "2026-11-07", to: "2026-11-22", pace: 10 }); // 22,5 → 23 hari; 37,5 → 38 hari
  });

  it("posisi 1 → minimal besok", () => {
    const e = estimateFinish(1, recent, today)!;
    expect(e.from > today).toBe(true);
  });

  it("tanpa data cukup → null", () => {
    expect(estimateFinish(2, [], today)).toBeNull();
  });
});
