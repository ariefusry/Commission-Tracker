import { describe, expect, it } from "vitest";
import en from "./i18n/en";
import id from "./i18n/id";
import { dueForReminder, reminderText, type ReminderRow } from "./reminders";

const today = "2026-10-15";
const row = (o: Partial<ReminderRow>): ReminderRow => ({
  client_username: "client",
  type_name: "Halfbody",
  deadline: null,
  status: "in_progress",
  ...o,
});

describe("dueForReminder", () => {
  it("terlambat + deadline dalam N hari; selesai, batal, tanpa deadline diabaikan", () => {
    const rows = [
      row({ client_username: "late", deadline: "2026-10-12" }),
      row({ client_username: "today", deadline: "2026-10-15" }),
      row({ client_username: "in3", deadline: "2026-10-18" }),
      row({ client_username: "in4", deadline: "2026-10-19" }),
      row({ client_username: "done", deadline: "2026-10-10", status: "done" }),
      row({ client_username: "cancel", deadline: "2026-10-10", status: "cancelled" }),
      row({ client_username: "none" }),
    ];
    const d = dueForReminder(rows, today, 3);
    expect(d.late.map((r) => r.client_username)).toEqual(["late"]);
    expect(d.soon.map((r) => r.client_username)).toEqual(["today", "in3"]);
    expect(dueForReminder(rows, today, 4).soon.map((r) => r.client_username)).toEqual(["today", "in3", "in4"]);
  });
});

describe("reminderText", () => {
  it("null jika tidak ada yang perlu diingatkan", () => {
    expect(reminderText([row({ deadline: "2026-11-30" })], today, 3, id, "https://x.app")).toBeNull();
  });

  it("pesan per bahasa berisi bagian terlambat, segera, dan link", () => {
    const rows = [row({ client_username: "kuro", deadline: "2026-10-11" }), row({ client_username: "hana", deadline: "2026-10-16" })];
    const textId = reminderText(rows, today, 3, id, "https://x.app")!;
    expect(textId).toContain("Terlambat (1)");
    expect(textId).toContain("• kuro (Halfbody) · Terlambat 4 hari");
    expect(textId).toContain("Deadline dalam 3 hari (1)");
    expect(textId).toContain("• hana (Halfbody) · 1 hari lagi");
    expect(textId).toContain("https://x.app/commissions");
    const textEn = reminderText(rows, today, 3, en, "https://x.app")!;
    expect(textEn).toContain("• kuro (Halfbody) · 4 days late");
    expect(textEn).toContain("Due within 3 days (1)");
  });
});
