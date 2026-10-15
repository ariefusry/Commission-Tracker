-- Uji delete_own_account: hanya akun sendiri, semua data ikut terhapus, anon ditolak. ROLLBACK.
begin;

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000d1', 'del-a@test.local', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-0000000000d2', 'del-b@test.local', 'authenticated', 'authenticated');

-- Data user A: commission + add-on + gambar WIP (memakai tahap → menguji urutan hapus vs restrict).
insert into public.commissions (id, user_id, client_username, type_custom, stage_id, tracking_code)
values ('10000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', 'client-a', 'X',
        (select id from public.stages where user_id = '00000000-0000-0000-0000-0000000000d1' and sort_order = 1), 'dddd0001'),
       ('10000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d2', 'client-b', 'X',
        (select id from public.stages where user_id = '00000000-0000-0000-0000-0000000000d2' and sort_order = 1), 'dddd0002');
insert into public.commission_addons (commission_id, custom_name, price)
values ('10000000-0000-0000-0000-0000000000d1', 'extra', 1000);
insert into public.wip_images (commission_id, stage_id, storage_path)
values ('10000000-0000-0000-0000-0000000000d1',
        (select id from public.stages where user_id = '00000000-0000-0000-0000-0000000000d1' and sort_order = 1),
        '00000000-0000-0000-0000-0000000000d1/10000000-0000-0000-0000-0000000000d1/1.webp');

-- Anon tidak boleh memanggil.
set local role anon;
do $$
begin
  perform public.delete_own_account();
  raise exception 'anon bisa menghapus akun';
exception when insufficient_privilege then null;
end $$;
reset role;

-- User A menghapus akunnya sendiri.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select public.delete_own_account();
reset role;

do $$
declare a uuid := '00000000-0000-0000-0000-0000000000d1';
begin
  if exists (select 1 from auth.users where id = a) then raise exception 'user A masih ada'; end if;
  if exists (select 1 from public.commissions where user_id = a) then raise exception 'commission A masih ada'; end if;
  if exists (select 1 from public.wip_images where storage_path like a::text || '/%') then raise exception 'wip A masih ada'; end if;
  if exists (select 1 from public.stages where user_id = a) then raise exception 'tahap A masih ada'; end if;
  if exists (select 1 from public.commission_types where user_id = a) then raise exception 'tipe A masih ada'; end if;
  if exists (select 1 from public.settings where user_id = a) then raise exception 'settings A masih ada'; end if;
  -- User B tidak tersentuh.
  if not exists (select 1 from public.commissions where id = '10000000-0000-0000-0000-0000000000d2') then
    raise exception 'data user B ikut terhapus';
  end if;
end $$;

select 'delete_account ok' as result;
rollback;
