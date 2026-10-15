import type { Status } from "@/lib/commission";
import { deadlineInfo, deadlineLabel } from "@/lib/deadline";
import type { Dict } from "@/lib/i18n";

// Pengingat deadline harian (cron /api/cron/reminders dan tombol "Kirim tes" di Pengaturan).

export type ReminderRow = { client_username: string; type_name: string; deadline: string | null; status: Status };

/** Terlambat + deadline dalam `days` hari ke depan (hari ini termasuk). Selesai/batal diabaikan. */
export function dueForReminder<T extends ReminderRow>(rows: T[], today: string, days: number) {
  const late: T[] = [];
  const soon: T[] = [];
  for (const r of rows) {
    const info = deadlineInfo(r.deadline, r.status, today);
    if (info.days === null) continue;
    if (info.days < 0) late.push(r);
    else if (info.days <= days) soon.push(r);
  }
  const byDeadline = (a: T, b: T) => (a.deadline ?? "").localeCompare(b.deadline ?? "");
  return { late: late.sort(byDeadline), soon: soon.sort(byDeadline) };
}

/** Teks pesan (Markdown Discord, juga dipakai untuk email polos). null jika tidak ada yang perlu diingatkan. */
export function reminderText(rows: ReminderRow[], today: string, days: number, t: Dict, appUrl: string): string | null {
  const { late, soon } = dueForReminder(rows, today, days);
  if (!late.length && !soon.length) return null;
  const line = (r: ReminderRow) =>
    `• ${r.client_username} (${r.type_name}) · ${deadlineLabel(deadlineInfo(r.deadline, r.status, today), t)}`;
  const parts = [`**${t.reminders.messageTitle}**`];
  if (late.length) parts.push("", `${t.reminders.messageLate} (${late.length})`, ...late.map(line));
  if (soon.length) parts.push("", `${t.reminders.messageSoon(days)} (${soon.length})`, ...soon.map(line));
  parts.push("", `${t.reminders.messageOpen}: ${appUrl}/commissions`);
  return parts.join("\n");
}
