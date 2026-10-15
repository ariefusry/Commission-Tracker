-- Uji kolom pengingat: default, validasi URL webhook, discord wajib URL. ROLLBACK.
begin;

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000e1', 'rem@test.local', 'authenticated', 'authenticated');

do $$
declare u uuid := '00000000-0000-0000-0000-0000000000e1';
begin
  if (select reminder_channel from public.settings where user_id = u) <> 'off' then raise exception 'default bukan off'; end if;

  -- Discord tanpa URL ditolak.
  begin
    update public.settings set reminder_channel = 'discord' where user_id = u;
    raise exception 'discord tanpa URL diterima';
  exception when check_violation then null;
  end;

  -- URL bukan webhook Discord ditolak (cegah server mengirim ke alamat lain).
  begin
    update public.settings set discord_webhook_url = 'https://evil.example.com/api/webhooks/1/abc' where user_id = u;
    raise exception 'URL non-discord diterima';
  exception when check_violation then null;
  end;
  begin
    update public.settings set discord_webhook_url = 'https://discord.com.evil.io/api/webhooks/1/abc' where user_id = u;
    raise exception 'subdomain palsu diterima';
  exception when check_violation then null;
  end;

  update public.settings
  set reminder_channel = 'discord', discord_webhook_url = 'https://discord.com/api/webhooks/123456/abc-DEF_9', reminder_days = 5
  where user_id = u;

  begin
    update public.settings set reminder_days = 30 where user_id = u;
    raise exception 'reminder_days 30 diterima';
  exception when check_violation then null;
  end;
end $$;

select 'reminders ok' as result;
rollback;
