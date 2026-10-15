import { NextResponse, type NextRequest } from "next/server";
import { todayWib } from "@/lib/date";
import { dictFor, toLocale } from "@/lib/i18n";
import { emailAvailable, sendDiscord, sendEmail } from "@/lib/notify";
import { reminderText } from "@/lib/reminders";
import { addDays } from "@/lib/stats";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Dipanggil Vercel Cron setiap hari pukul 08.00 WIB: kirim pengingat deadline ke artist
 * yang mengaktifkannya. Satu kali per hari per artist (settings.last_reminded_on).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = todayWib();
  const appUrl = request.nextUrl.origin;
  const { data: users, error } = await supabase
    .from("settings")
    .select("user_id, reminder_channel, discord_webhook_url, reminder_days, reminder_locale")
    .neq("reminder_channel", "off")
    .or(`last_reminded_on.is.null,last_reminded_on.lt.${today}`);
  if (error) {
    console.error("reminders select", error);
    return NextResponse.json({ error: "select failed" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  for (const u of users) {
    const { data: rows, error: rowsError } = await supabase
      .from("commissions")
      .select("client_username, deadline, status, type_custom, commission_types(name)")
      .eq("user_id", u.user_id)
      .not("status", "in", "(done,cancelled)")
      .lte("deadline", addDays(today, u.reminder_days));
    if (rowsError) {
      console.error("reminders rows", u.user_id, rowsError);
      failed++;
      continue;
    }

    const t = dictFor(toLocale(u.reminder_locale));
    const list = rows.map((r) => ({ ...r, type_name: r.commission_types?.name ?? r.type_custom ?? "Custom" }));
    const text = reminderText(list, today, u.reminder_days, t, appUrl);
    if (text) {
      let ok = false;
      if (u.reminder_channel === "discord" && u.discord_webhook_url) {
        ok = await sendDiscord(u.discord_webhook_url, text);
      } else if (u.reminder_channel === "email" && emailAvailable()) {
        const { data: user } = await supabase.auth.admin.getUserById(u.user_id);
        ok = Boolean(user.user?.email) && (await sendEmail(user.user!.email!, t.reminders.messageTitle, text));
      }
      if (!ok) {
        // Tidak menandai terkirim: dicoba lagi pada pemanggilan cron berikutnya.
        console.error("reminders send failed", u.user_id, u.reminder_channel);
        failed++;
        continue;
      }
      sent++;
    }
    // Hari ini sudah diperiksa (terkirim atau memang tidak ada yang jatuh tempo).
    await supabase.from("settings").update({ last_reminded_on: today }).eq("user_id", u.user_id);
  }

  return NextResponse.json({ checked: users.length, sent, failed });
}
