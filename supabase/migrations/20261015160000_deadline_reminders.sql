-- Pengingat deadline harian (Vercel Cron → /api/cron/reminders, pakai secret key).
-- Saluran dipilih artist: off / discord / email. Email aktif setelah layanan pengirim dipasang.
alter table settings
  add column reminder_channel text not null default 'off'
    check (reminder_channel in ('off', 'discord', 'email')),
  -- Hanya URL webhook resmi Discord (server mengirim POST ke sini; cegah alamat lain).
  add column discord_webhook_url text
    check (discord_webhook_url ~ '^https://(ptb\.|canary\.)?(discord|discordapp)\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$'),
  add column reminder_days integer not null default 3 check (reminder_days between 1 and 14),
  add column reminder_locale text not null default 'id' check (reminder_locale in ('id', 'en')),
  -- Tanggal (WIB) pengingat terakhir terkirim: cron yang diulang tidak mengirim dua kali.
  add column last_reminded_on date,
  add constraint reminder_discord_needs_url
    check (reminder_channel <> 'discord' or discord_webhook_url is not null);
