-- Uji save_commission. Transaksi di-ROLLBACK: tidak meninggalkan data.
begin;

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'save-a@test.local', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-00000000000b', 'save-b@test.local', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare
  v_id uuid;
  v_addon uuid := (select id from public.addons where name = 'Detailed character');
  c public.commissions;
begin
  -- create: dengan add-on katalog + custom, reference_links array
  v_id := public.save_commission(p_id => null,
    p_data => jsonb_build_object('client_username', 'kiki', 'type_custom', 'Chibi', 'start_date', '2026-10-15',
      'stage', 'sketch', 'status', 'in_progress', 'revision_count', 0, 'payment_status', 'dp',
      'dp_amount', 50000, 'base_price', 0, 'price_override', null, 'price_total', 100000,
      'reference_links', jsonb_build_array('https://a.test/1', 'https://a.test/2')),
    p_addons => jsonb_build_array(
      jsonb_build_object('addon_id', v_addon, 'custom_name', null, 'price', 25000),
      jsonb_build_object('addon_id', null, 'custom_name', 'Extra pose', 'price', 75000)));

  select * into c from public.commissions where id = v_id;
  if c.user_id <> '00000000-0000-0000-0000-00000000000a' then raise exception 'user_id bukan dari auth.uid()'; end if;
  if length(c.tracking_code) <> 8 then raise exception 'tracking_code tidak 8 karakter'; end if;
  if c.reference_links <> array['https://a.test/1', 'https://a.test/2'] then raise exception 'reference_links salah'; end if;
  if (select count(*) from public.commission_addons where commission_id = v_id) <> 2 then raise exception 'add-on create salah'; end if;

  -- update: ganti add-on jadi satu, tracking_code tetap
  perform public.save_commission(p_id => v_id,
    p_data => jsonb_build_object('client_username', 'kiki2', 'type_custom', 'Chibi', 'start_date', '2026-10-15',
      'stage', 'lineart', 'status', 'in_progress', 'revision_count', 1, 'payment_status', 'paid',
      'dp_amount', 50000, 'base_price', 0, 'price_override', 90000, 'price_total', 90000),
    p_addons => jsonb_build_array(jsonb_build_object('addon_id', null, 'custom_name', 'Extra pose', 'price', 75000)));

  if (select client_username from public.commissions where id = v_id) <> 'kiki2' then raise exception 'update gagal'; end if;
  if (select tracking_code from public.commissions where id = v_id) <> c.tracking_code then raise exception 'tracking_code berubah saat update'; end if;
  if (select count(*) from public.commission_addons where commission_id = v_id) <> 1 then raise exception 'add-on tidak diganti'; end if;

  -- atomik: add-on tidak valid -> commission juga tidak berubah
  begin
    perform public.save_commission(p_id => v_id,
      p_data => jsonb_build_object('client_username', 'harus-rollback', 'type_custom', 'Chibi', 'start_date', '2026-10-15',
        'stage', 'lineart', 'status', 'in_progress', 'revision_count', 1, 'payment_status', 'paid',
        'dp_amount', 0, 'base_price', 0, 'price_total', 90000),
      p_addons => jsonb_build_array(jsonb_build_object('addon_id', null, 'custom_name', null, 'price', 1)));
    raise exception 'add-on tidak valid seharusnya ditolak';
  exception when check_violation then null;
  end;
  if (select client_username from public.commissions where id = v_id) <> 'kiki2' then raise exception 'tidak atomik'; end if;

  perform set_config('test.id', v_id::text, true);
end $$;

-- user B tidak bisa mengubah commission A lewat fungsi ini
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
do $$ begin
  begin
    perform public.save_commission(p_id => current_setting('test.id')::uuid,
      p_data => jsonb_build_object('client_username', 'hack', 'type_custom', 'X', 'start_date', '2026-10-15',
        'stage', 'queue', 'status', 'queue', 'revision_count', 0, 'payment_status', 'unpaid',
        'dp_amount', 0, 'base_price', 0, 'price_total', 0), p_addons => '[]');
    raise exception 'B bisa mengubah commission A';
  exception when no_data_found then null;
  end;
end $$;

reset role;
select 'save_commission OK' as result;
rollback;
