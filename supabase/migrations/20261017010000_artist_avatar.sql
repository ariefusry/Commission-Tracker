-- Foto profil artist: tampil di halaman tracking client.
-- Bucket sendiri (bukan wip): path {user_id}/{acak}.{webp|jpg}, maksimal 256 KB.

-- 1. Bucket publik (dibaca lewat URL acak); hanya WebP/JPEG hasil kompres di browser.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 262144, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Jumlah file per user, untuk policy upload. security definer: subquery ke storage.objects
-- di dalam policy storage.objects sendiri memicu rekursi (lihat 20261016020000).
create or replace function public.avatar_object_count(p_user text) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from storage.objects
  where bucket_id = 'avatars' and (storage.foldername(name))[1] = p_user;
$$;
revoke execute on function public.avatar_object_count(text) from public, anon;
grant execute on function public.avatar_object_count(text) to authenticated;

-- Upload langsung lewat Storage API pun dibatasi: hanya folder sendiri, satu tingkat, maksimal 3 file
-- (foto lama + baru saat ganti, plus satu cadangan bila hapus file lama gagal).
create policy "avatar upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
    and public.avatar_object_count((select auth.uid())::text) < 3
  );

create policy "avatar delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- remove() hanya mengembalikan file yang terlihat: perlu select atas folder sendiri (seperti wip).
create policy "avatar read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 2. Path foto di settings: wajib di folder milik pemilik baris, nama file acak.
alter table public.settings
  add column avatar_path text check (
    avatar_path is null
    or (split_part(avatar_path, '/', 1) = user_id::text
        and avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](webp|jpg)$')
  );

-- 3. get_tracking sama seperti 20261017000000, ditambah artist_avatar.
drop function get_tracking(text);

create function get_tracking(p_code text)
returns table (
  artist_name text,
  client_username text,
  type_name text,
  status commission_status,
  start_date date,
  deadline date,
  updated_at timestamptz,
  stages text[],
  current_stage integer,
  queue_position integer,     -- urutan keseluruhan (dikerjakan + antre); null jika disembunyikan / selesai / batal
  queue_total integer,
  wait_position integer,      -- urutan di antrean tunggu (status queue); null jika sudah dikerjakan
  wait_total integer,
  slot_limit integer,         -- jumlah commission yang dikerjakan bersamaan
  queue jsonb,                -- [{pos, stage, status, you}] maks. 50 teratas + posisi client
  recent_completions date[],  -- 10 tanggal selesai terakhir (WIB), dasar perkiraan
  wip jsonb,                  -- gambar WIP commission ini: [{path, stage, created_at}] terbaru dulu
  accent_color text,          -- warna aksen pilihan artist (null = netral)
  artist_avatar text          -- path foto profil artist di bucket avatars (null = inisial)
)
language sql stable security definer set search_path = '' as $$
  with c as (
    select * from public.commissions
    where p_code ~ '^[0-9a-f]{16}$' and tracking_code = p_code
  ),
  flag as (
    select coalesce(st.show_queue, true) and c.status in ('queue', 'in_progress', 'revision') as visible
    from c left join public.settings st on st.user_id = c.user_id
  ),
  -- Antrean artist: belum selesai/batal, urut prioritas artist (queue_order), lalu tanggal pesan.
  q as (
    select a.id, a.status, x.name as stage,
           row_number() over (order by a.queue_order, a.start_date, a.created_at, a.id) as pos,
           case when a.status = 'queue'
             then row_number() over (partition by a.status = 'queue' order by a.queue_order, a.start_date, a.created_at, a.id)
           end as wait_pos
    from public.commissions a
    join c on a.user_id = c.user_id
    join public.stages x on x.id = a.stage_id
    where a.status in ('queue', 'in_progress', 'revision')
  )
  select
    nullif(trim(st.display_name), ''),
    c.client_username,
    coalesce(t.name, c.type_custom, 'Custom'),
    c.status,
    c.start_date,
    c.deadline,
    c.updated_at,
    s.names,
    s.current_index,
    case when f.visible then (select q.pos from q where q.id = c.id)::integer end,
    case when f.visible then (select count(*) from q)::integer end,
    case when f.visible then (select q.wait_pos from q where q.id = c.id)::integer end,
    case when f.visible then (select count(*) from q where q.status = 'queue')::integer end,
    case when f.visible then st.slot_limit end,
    case when f.visible then (
      select jsonb_agg(jsonb_build_object('pos', q.pos, 'stage', q.stage, 'status', q.status, 'you', q.id = c.id) order by q.pos)
      from q where q.pos <= 50 or q.id = c.id
    ) end,
    case when f.visible then (
      select array_agg(r.d order by r.d desc)
      from (
        select (z.completed_at at time zone 'Asia/Jakarta')::date as d
        from public.commissions z
        where z.user_id = c.user_id and z.status = 'done' and z.completed_at is not null
        order by z.completed_at desc
        limit 10
      ) r
    ) end,
    (
      select jsonb_agg(jsonb_build_object('path', w.storage_path, 'stage', ws.name, 'created_at', w.created_at) order by w.created_at desc)
      from public.wip_images w
      left join public.stages ws on ws.id = w.stage_id
      where w.commission_id = c.id
    ),
    st.accent_color,
    st.avatar_path
  from c
  cross join flag f
  left join public.settings st on st.user_id = c.user_id
  left join public.commission_types t on t.id = c.type_id
  cross join lateral (
    -- Tahap aktif milik artist (+ tahap commission ini walau nonaktif), urut sesuai Pengaturan.
    select
      array_agg(x.name order by x.sort_order, x.name) as names,
      (array_position(array_agg(x.id order by x.sort_order, x.name), c.stage_id) - 1) as current_index
    from public.stages x
    where x.user_id = c.user_id and (x.is_active or x.id = c.stage_id)
  ) s;
$$;

revoke execute on function get_tracking(text) from public;
grant execute on function get_tracking(text) to anon, authenticated;
