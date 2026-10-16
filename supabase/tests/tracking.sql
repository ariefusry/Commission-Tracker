-- Uji get_tracking (halaman publik). Transaksi di-ROLLBACK: tidak meninggalkan data.
begin;

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'track-a@test.local', 'authenticated', 'authenticated');
update public.settings set display_name = 'Studio A' where user_id = '00000000-0000-0000-0000-00000000000a';
-- Tahap ke-3 dinonaktifkan tapi dipakai commission ini → tetap muncul.
update public.stages set is_active = false where user_id = '00000000-0000-0000-0000-00000000000a' and name = 'Lineart';
update public.stages set is_active = false where user_id = '00000000-0000-0000-0000-00000000000a' and name = 'Coloring';

insert into public.commissions (user_id, client_username, type_custom, stage_id, tracking_code, price_total, dp_amount, payment_status, contact_handle, notes)
values ('00000000-0000-0000-0000-00000000000a', 'client-x', 'Chibi',
        (select id from public.stages where user_id = '00000000-0000-0000-0000-00000000000a' and name = 'Lineart'),
        'abcd1234abcd1234', 150000, 50000, 'dp', '@rahasia', 'catatan rahasia');

set local role anon;

do $$
declare r record;
begin
  select * into r from public.get_tracking('abcd1234abcd1234');
  if r.client_username is distinct from 'client-x' then raise exception 'anon tidak bisa tracking'; end if;
  if r.artist_name is distinct from 'Studio A' then raise exception 'nama artist salah'; end if;
  if r.type_name is distinct from 'Chibi' then raise exception 'tipe salah'; end if;
  -- Lineart nonaktif tapi dipakai → ikut; Coloring nonaktif & tidak dipakai → tidak ikut.
  if r.stages is distinct from array['Dikonfirmasi', 'Sketsa', 'Lineart', 'Finishing'] then raise exception 'daftar tahap salah: %', r.stages; end if;
  if r.current_stage is distinct from 2 then raise exception 'indeks tahap salah: %', r.current_stage; end if;

  if exists (select 1 from public.get_tracking('ABCD1234ABCD1234')) then raise exception 'kode harus persis (huruf kecil)'; end if;
  if exists (select 1 from public.get_tracking('abcd1234abcd123')) then raise exception 'kode 15 karakter diterima'; end if;
  if exists (select 1 from public.get_tracking('abcd1234')) then raise exception 'kode 8 karakter (format lama) diterima'; end if;
  if exists (select 1 from public.get_tracking('%')) then raise exception 'wildcard diterima'; end if;
  if exists (select 1 from public.get_tracking('0000000000000000')) then raise exception 'kode tak dikenal mengembalikan data'; end if;

  begin
    perform 1 from public.commissions;
    raise exception 'anon bisa membaca commissions';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Kolom sensitif tidak pernah ada di hasil fungsi.
do $$
declare result text := pg_get_function_result('public.get_tracking(text)'::regprocedure);
begin
  if result ~ '(price|dp_amount|payment_status|contact|notes|reference_links|user_id)' then
    raise exception 'kolom sensitif terekspos: %', result;
  end if;
end $$;

select 'tracking OK' as result;
rollback;
