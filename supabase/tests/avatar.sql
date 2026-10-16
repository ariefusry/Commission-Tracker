-- Uji foto profil: path milik sendiri, policy bucket avatars, maks. 3 file, get_tracking. ROLLBACK.
begin;

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000a1', 'avatar-a@test.local', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-0000000000b1', 'avatar-b@test.local', 'authenticated', 'authenticated');

insert into public.commissions (id, user_id, client_username, type_custom, stage_id, tracking_code)
values ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'client-a', 'X',
        (select id from public.stages where user_id = '00000000-0000-0000-0000-0000000000a1' and name = 'Sketsa'), 'aaaa0001aaaa0001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

do $$
declare i int;
begin
  -- settings.avatar_path: folder user lain dan nama file bebas ditolak.
  begin
    update public.settings set avatar_path = '00000000-0000-0000-0000-0000000000b1/20000000-0000-0000-0000-000000000001.webp';
    raise exception 'avatar_path di folder user lain diterima';
  exception when check_violation then null;
  end;
  begin
    update public.settings set avatar_path = '00000000-0000-0000-0000-0000000000a1/../evil.webp';
    raise exception 'nama file bebas diterima';
  exception when check_violation then null;
  end;
  update public.settings set avatar_path = '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-000000000001.webp';

  -- Storage: folder user lain dan subfolder ditolak.
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000b1/x.webp');
    raise exception 'upload ke folder user lain diterima';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000a1/sub/x.webp');
    raise exception 'upload ke subfolder diterima';
  exception when insufficient_privilege then null;
  end;

  -- Maksimal 3 file per user.
  for i in 1..3 loop
    insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000a1/' || i || '.webp');
  end loop;
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000a1/4.webp');
    raise exception 'file ke-4 diterima';
  exception when insufficient_privilege then null;
  end;
end $$;

-- User B tidak melihat file A.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from storage.objects where bucket_id = 'avatars') <> 0 then raise exception 'B melihat file avatar A'; end if;
end $$;

-- Client (anon) menerima path foto lewat get_tracking.
reset role;
set local role anon;
do $$ begin
  if (select artist_avatar from public.get_tracking('aaaa0001aaaa0001'))
     is distinct from '00000000-0000-0000-0000-0000000000a1/20000000-0000-0000-0000-000000000001.webp' then
    raise exception 'get_tracking tidak mengembalikan artist_avatar';
  end if;
end $$;

reset role;
rollback;
