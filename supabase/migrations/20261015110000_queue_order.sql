-- Prioritas manual (drag & drop di board): urutan commission per artist.
alter table commissions add column queue_order double precision;

-- Urutan awal = tanggal pesan. Jarak 1000 agar bisa disisipkan di tengah (nilai tengah dua tetangga).
update commissions c
set queue_order = r.rn * 1000
from (
  select id, row_number() over (partition by user_id order by start_date, created_at, id) as rn
  from commissions
) r
where r.id = c.id;

-- Commission baru masuk di urutan paling bawah.
create or replace function set_queue_order() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.queue_order is null then
    new.queue_order = coalesce((select max(queue_order) from public.commissions where user_id = new.user_id), 0) + 1000;
  end if;
  return new;
end;
$$;

create trigger commissions_queue_order
before insert on commissions
for each row execute function set_queue_order();

alter table commissions alter column queue_order set not null;
create index on commissions (user_id, queue_order);

-- get_tracking memakai urutan prioritas yang sama dengan board.
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
  recent_completions date[]   -- 10 tanggal selesai terakhir (WIB), dasar perkiraan
)
language sql stable security definer set search_path = '' as $$
  with c as (
    select * from public.commissions
    where p_code ~ '^[0-9a-f]{8}$' and tracking_code = p_code
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
    ) end
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
