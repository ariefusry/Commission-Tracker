import "server-only";
import { DISCORD_WEBHOOK_RE } from "@/lib/validators";

// Pengiriman pengingat. Discord: webhook milik artist. Email: Resend (aktif jika env diisi).

const TIMEOUT_MS = 8000;
const DISCORD_MAX = 2000; // batas panjang pesan Discord

export async function sendDiscord(url: string, content: string): Promise<boolean> {
  if (!DISCORD_WEBHOOK_RE.test(url)) return false;
  const text = content.length > DISCORD_MAX ? `${content.slice(0, DISCORD_MAX - 1)}…` : content;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // allowed_mentions kosong: nama client tidak bisa memicu @everyone/@here.
      body: JSON.stringify({ content: text, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "error",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Email butuh RESEND_API_KEY dan REMINDER_EMAIL_FROM (alamat di domain yang sudah diverifikasi Resend). */
export function emailAvailable(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.REMINDER_EMAIL_FROM);
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailAvailable()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.REMINDER_EMAIL_FROM, to, subject, text: text.replaceAll("**", "") }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}
