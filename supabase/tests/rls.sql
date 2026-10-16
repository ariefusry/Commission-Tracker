-- Uji RLS + trigger user baru. Jalan di dalam transaksi lalu ROLLBACK:
-- tidak meninggalkan data apa pun. Gagal = raise exception.
begin;

-- Dua user: A dan B. Aplikasi gratis: cukup login, tiap user hanya melihat datanya sendiri.
insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'rls-a@test.local', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-00000000000b', 'rls-b@test.local', 'authenticated', 'authenticated');

do $$ begin
  if (select count(*) from public.commission_types where user_id = '00000000-0000-0000-0000-00000000000a') <> 5
    then raise exception 'trigger: tipe default tidak dibuat'; end if;
  if (select count(*) from public.stages where user_id = '00000000-0000-0000-0000-00000000000a') <> 5
    then raise exception 'trigger: tahap default tidak dibuat'; end if;
  if not exists (select 1 from public.settings where user_id = '00000000-0000-0000-0000-00000000000a')
    then raise exception 'trigger: settings tidak dibuat'; end if;
  -- Tabel langganan sudah dihapus (aplikasi gratis).
  if to_regclass('public.subscriptions') is not null then raise exception 'tabel subscriptions masih ada'; end if;
end $$;

insert into public.commissions (user_id, client_username, type_custom, stage_id)
select u, c, 'Custom', (select id from public.stages where user_id = u order by sort_order limit 1)
from (values ('00000000-0000-0000-0000-00000000000a'::uuid, 'client-a'),
             ('00000000-0000-0000-0000-00000000000b'::uuid, 'client-b')) as v(u, c);

-- Sebagai user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$ begin
  if (select count(*) from public.commissions) <> 1 then raise exception 'A harus melihat tepat 1 commission (miliknya)'; end if;
  if exists (select 1 from public.commissions where client_username = 'client-b') then raise exception 'A bisa melihat data B'; end if;
  if (select count(*) from public.commission_types) <> 5 then raise exception 'A harus melihat 5 tipe miliknya saja'; end if;
  if (select count(*) from public.stages) <> 5 then raise exception 'A harus melihat 5 tahap miliknya saja'; end if;
  update public.commissions set notes = 'hack' where client_username = 'client-b';
  if found then raise exception 'A bisa mengubah data B'; end if;
  begin
    insert into public.commissions (user_id, client_username, type_custom, stage_id)
    values ('00000000-0000-0000-0000-00000000000b', 'spoof', 'Custom', (select id from public.stages limit 1));
    raise exception 'A bisa insert atas nama B';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Sebagai user B: hanya datanya sendiri.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$ begin
  if (select count(*) from public.commissions) <> 1 then raise exception 'B harus melihat tepat 1 commission (miliknya)'; end if;
  if exists (select 1 from public.commissions where client_username = 'client-a') then raise exception 'B bisa melihat data A'; end if;
  insert into public.commissions (user_id, client_username, type_custom, stage_id)
  values ('00000000-0000-0000-0000-00000000000b', 'x', 'Custom', (select id from public.stages limit 1));
end $$;

-- Tanpa login (claims kosong) tidak ada akses walau role authenticated.
select set_config('request.jwt.claims', '{}', true);
do $$ begin
  if (select count(*) from public.commissions) <> 0 then raise exception 'tanpa sub bisa membaca commission'; end if;
end $$;

-- Sebagai anon
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.commissions;
    raise exception 'anon bisa membaca commissions';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'RLS OK' as result;
rollback;
