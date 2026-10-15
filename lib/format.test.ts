import { describe, expect, it } from "vitest";
import { formatDate, formatPeriodKey } from "./format";

describe("format per bahasa", () => {
  it("tanggal", () => {
    expect(formatDate("2026-10-15")).toBe("15 Okt 2026");
    expect(formatDate("2026-10-15", "en-GB")).toBe("15 Oct 2026");
    expect(formatDate(null)).toBe("-");
  });

  it("label sumbu grafik harian dan bulanan", () => {
    expect(formatPeriodKey("2026-10-12")).toBe("12 Okt");
    expect(formatPeriodKey("2026-08")).toBe("Agu 26");
    expect(formatPeriodKey("2026-08", "en-GB")).toBe("Aug 26");
  });
});
