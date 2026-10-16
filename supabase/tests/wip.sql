-- Uji wip_images: path milik sendiri, maks. 10, isolasi user, get_tracking. ROLLBACK.
begin;

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'wip-a@test.local', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-00000000000b', 'wip-b@test.local', 'authenticated', 'authenticated');

insert into public.commissions (id, user_id, client_username, type_custom, stage_id, tracking_code)
values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'client-a', 'X',
        (select id from public.stages where user_id = '00000000-0000-0000-0000-00000000000a' and name = 'Sketsa'), 'bbbb0001bbbb0001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare i int;
begin
  -- Path di luar folder sendiri ditolak.
  begin
    insert into public.wip_images (commission_id, stage_id, storage_path)
    values ('10000000-0000-0000-0000-00000000000a', null, '00000000-0000-0000-0000-00000000000b/10000000-0000-0000-0000-00000000000a/x.webp');
    raise exception 'path folder user lain diterima';
  exception when insufficient_privilege then null;
  end;

  for i in 1..10 loop
    insert into public.wip_images (commission_id, stage_id, storage_path, created_at)
    values ('10000000-0000-0000-0000-00000000000a',
            (select id from public.stages where name = 'Sketsa'),
            '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-00000000000a/' || i || '.webp',
            now() + make_interval(mins => i));
  end loop;

  begin
    insert into public.wip_images (commission_id, stage_id, storage_path)
    values ('10000000-0000-0000-0000-00000000000a', null, '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-00000000000a/11.webp');
    raise exception 'gambar ke-11 diterima';
  exception when check_violation then null;
  end;
end $$;

-- User B tidak melihat dan tidak bisa menambah ke commission A.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.wip_images) <> 0 then raise exception 'B melihat WIP milik A'; end if;
  begin
    insert into public.wip_images (commission_id, stage_id, storage_path)
    values ('10000000-0000-0000-0000-00000000000a', null, '00000000-0000-0000-0000-00000000000b/10000000-0000-0000-0000-00000000000a/z.webp');
    raise exception 'B bisa menambah WIP ke commission A';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Client (anon) melihat daftar WIP lewat get_tracking, terbaru dulu, dengan nama tahap.
reset role;
set local role anon;
do $$
declare r record;
begin
  select * into r from public.get_tracking('bbbb0001bbbb0001');
  if jsonb_array_length(r.wip) <> 10 then raise exception 'jumlah WIP salah: %', jsonb_array_length(r.wip); end if;
  if r.wip -> 0 ->> 'path' not like '%/10.webp' then raise exception 'urutan WIP bukan terbaru dulu: %', r.wip -> 0; end if;
  if r.wip -> 0 ->> 'stage' <> 'Sketsa' then raise exception 'nama tahap WIP salah'; end if;
end $$;

reset role;
select 'wip OK' as result;
rollback;
