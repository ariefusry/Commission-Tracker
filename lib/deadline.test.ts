import { describe, expect, it } from "vitest";
import { deadlineInfo, localToday } from "./deadline";

const today = "2026-10-15";

describe("deadlineInfo", () => {
  it("terlambat jika deadline lewat dan belum selesai", () => {
    expect(deadlineInfo("2026-10-12", "in_progress", today)).toEqual({ tone: "late", label: "Terlambat 3 hari" });
  });

  it("selesai atau batal tidak pernah terlambat", () => {
    expect(deadlineInfo("2026-10-01", "done", today).tone).toBe("none");
    expect(deadlineInfo("2026-10-01", "cancelled", today).tone).toBe("none");
  });

  it("hari ini dan 3 hari ke depan = soon", () => {
    expect(deadlineInfo("2026-10-15", "queue", today)).toEqual({ tone: "soon", label: "Hari ini" });
    expect(deadlineInfo("2026-10-18", "queue", today)).toEqual({ tone: "soon", label: "3 hari lagi" });
    expect(deadlineInfo("2026-10-19", "queue", today)).toEqual({ tone: "normal", label: "4 hari lagi" });
  });

  it("tanpa deadline", () => {
    expect(deadlineInfo(null, "queue", today).tone).toBe("none");
  });
});

describe("localToday", () => {
  it("format YYYY-MM-DD", () => {
    expect(localToday(new Date(2026, 9, 15, 0, 30))).toBe("2026-10-15");
  });
});
