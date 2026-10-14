-- Data demo FIKTIF untuk akun demo@example.com. Tanggal relatif terhadap hari ini.
-- Idempoten: tidak melakukan apa-apa jika akun demo sudah punya commission.
-- Harga mengikuti price list default (lihat trigger handle_new_user):
-- Headshot 50k, Bust up 75k, Halfbody 100k, Knee up 125k, Full body 150k,
-- Detailed character 25k, Detailed background 50k.
do $$
declare
  uid uuid := (select id from auth.users where email = 'demo@example.com');
  today date := (now() at time zone 'Asia/Jakarta')::date;
  t record;
  dc uuid;
  db uuid;
begin
  if uid is null then raise exception 'akun demo belum dibuat'; end if;
  if exists (select 1 from public.commissions where user_id = uid) then
    raise notice 'demo sudah berisi data, dilewati';
    return;
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select id into dc from public.addons where name = 'Detailed character';
  select id into db from public.addons where name = 'Detailed background';

  for t in
    select * from (values
      -- client, platform, handle, tipe, harga tipe, addon, harga addon, mulai, deadline, nama tahap, status, bayar, dp, total
      ('mochi_draws',  'Twitter',   '@mochi_draws',  'Halfbody',  100000, 'dc', 25000, -110, -95, 'Finishing', 'done',        'paid',   0,     125000),
      ('ren.kaito',    'Discord',   'renkaito',      'Headshot',  50000,  null, 0,     -100, -90, 'Finishing', 'done',        'paid',   0,     50000),
      ('aya_sketch',   'Instagram', '@aya.sketch',   'Full body', 150000, 'db', 50000, -75,  -55, 'Finishing', 'done',        'paid',   0,     200000),
      ('pixelfox',     'Twitter',   '@pixelfox',     'Bust up',   75000,  null, 0,     -60,  -45, 'Finishing', 'cancelled',   'dp',     30000, 75000),
      ('lunaria',      'Discord',   'lunaria#2210',  'Knee up',   125000, 'dc', 25000, -40,  -20, 'Finishing', 'done',        'paid',   0,     150000),
      ('kuro_neko',    'Twitter',   '@kuroneko_art', 'Halfbody',  100000, 'db', 50000, -25,  -3,  'Coloring',  'in_progress', 'dp',     75000, 150000),
      ('sora.vt',      'Twitter',   '@sora_vtuber',  'Full body', 150000, 'dc', 25000, -15,  10,  'Lineart',   'in_progress', 'dp',     85000, 175000),
      ('hanabi',       'Instagram', '@hanabi.oc',    'Headshot',  50000,  null, 0,     -8,   5,   'Sketsa',    'revision',    'paid',   0,     50000),
      ('tetsu',        'Discord',   'tetsu_oc',      'Bust up',   75000,  'dc', 25000, -3,   18,  'Sketsa',    'in_progress', 'unpaid', 0,     100000),
      ('miko_chan',    'Twitter',   '@mikochan',     'Knee up',   125000, null, 0,     -1,   25,  'Antrean',   'queue',       'unpaid', 0,     125000)
    ) as v(client, platform, handle, type_name, base, addon, addon_price, start_off, deadline_off, stage, status, pay, dp, total)
  loop
    perform public.save_commission(
      p_data => jsonb_build_object(
        'client_username', t.client, 'contact_platform', t.platform, 'contact_handle', t.handle,
        'type_id', (select id from public.commission_types where name = t.type_name),
        'start_date', today + t.start_off, 'deadline', today + t.deadline_off,
        'stage_id', (select id from public.stages where user_id = uid and name = t.stage), 'status', t.status, 'revision_count', case when t.status = 'revision' then 1 else 0 end,
        'payment_status', t.pay, 'dp_amount', t.dp, 'base_price', t.base,
        'price_override', null, 'price_total', t.total),
      p_addons => case t.addon
        when 'dc' then jsonb_build_array(jsonb_build_object('addon_id', dc, 'price', t.addon_price))
        when 'db' then jsonb_build_array(jsonb_build_object('addon_id', db, 'price', t.addon_price))
        else '[]'::jsonb end);
  end loop;

  reset role;
end $$;
