import { describe, expect, it } from "vitest";
import { formatDate, formatPeriodKey, formatThousands, parseRupiah } from "./format";

describe("input harga", () => {
  it("parse teks berformat ke angka", () => {
    expect(parseRupiah("50.000")).toBe(50000);
    expect(parseRupiah("50,000")).toBe(50000);
    expect(parseRupiah("Rp 1.250.000")).toBe(1250000);
    expect(parseRupiah("")).toBeNull();
    expect(parseRupiah(null)).toBeNull();
    expect(parseRupiah(75000)).toBe(75000);
  });

  it("format ribuan per bahasa", () => {
    expect(formatThousands("50000")).toBe("50.000");
    expect(formatThousands("50.0001")).toBe("500.001");
    expect(formatThousands(1250000, "en-GB")).toBe("1,250,000");
    expect(formatThousands("007")).toBe("7");
    expect(formatThousands("abc")).toBe("");
  });
});

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
