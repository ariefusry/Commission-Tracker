import { describe, expect, it } from "vitest";
import en from "./i18n/en";
import id from "./i18n/id";
import { deadlineInfo, deadlineLabel, localToday } from "./deadline";

const today = "2026-10-15";

describe("deadlineInfo", () => {
  it("terlambat jika deadline lewat dan belum selesai", () => {
    expect(deadlineInfo("2026-10-12", "in_progress", today)).toEqual({ tone: "late", days: -3 });
  });

  it("selesai atau batal tidak pernah terlambat", () => {
    expect(deadlineInfo("2026-10-01", "done", today).tone).toBe("none");
    expect(deadlineInfo("2026-10-01", "cancelled", today).tone).toBe("none");
  });

  it("hari ini dan 3 hari ke depan = soon", () => {
    expect(deadlineInfo("2026-10-15", "queue", today)).toEqual({ tone: "soon", days: 0 });
    expect(deadlineInfo("2026-10-18", "queue", today)).toEqual({ tone: "soon", days: 3 });
    expect(deadlineInfo("2026-10-19", "queue", today)).toEqual({ tone: "normal", days: 4 });
  });

  it("label per bahasa", () => {
    const late = deadlineInfo("2026-10-12", "in_progress", today);
    expect(deadlineLabel(late, id)).toBe("Terlambat 3 hari");
    expect(deadlineLabel(late, en)).toBe("3 days late");
    expect(deadlineLabel(deadlineInfo("2026-10-16", "queue", today), en)).toBe("1 day left");
    expect(deadlineLabel(deadlineInfo("2026-10-15", "queue", today), id)).toBe("Hari ini");
    expect(deadlineLabel(deadlineInfo(null, "queue", today), id)).toBeNull();
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
