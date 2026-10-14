-- Halaman publik tracking (/track/[code]).
-- Akses lewat fungsi yang mengembalikan SATU commission untuk kode yang tepat:
-- anon tidak bisa membaca tabel apa pun dan tidak bisa mendaftar kode tracking.

-- Nama artist yang tampil di halaman tracking.
alter table settings add column display_name text check (char_length(display_name) <= 60);

-- Tetap jalan walaupun langganan artist habis (client tidak ikut terdampak).
create or replace function get_tracking(p_code text)
returns table (
  artist_name text,
  client_username text,
  type_name text,
  status commission_status,
  start_date date,
  deadline date,
  updated_at timestamptz,
  stages text[],
  current_stage integer
)
language sql stable security definer set search_path = '' as $$
  select
    nullif(trim(st.display_name), ''),
    c.client_username,
    coalesce(t.name, c.type_custom, 'Custom'),
    c.status,
    c.start_date,
    c.deadline,
    c.updated_at,
    s.names,
    s.current_index
  from public.commissions c
  left join public.commission_types t on t.id = c.type_id
  left join public.settings st on st.user_id = c.user_id
  cross join lateral (
    -- Tahap aktif milik artist (+ tahap commission ini walau nonaktif), urut sesuai Pengaturan.
    select
      array_agg(x.name order by x.sort_order, x.name) as names,
      (array_position(array_agg(x.id order by x.sort_order, x.name), c.stage_id) - 1) as current_index
    from public.stages x
    where x.user_id = c.user_id and (x.is_active or x.id = c.stage_id)
  ) s
  where p_code ~ '^[0-9a-f]{8}$' and c.tracking_code = p_code;
$$;

revoke execute on function get_tracking(text) from public;
grant execute on function get_tracking(text) to anon, authenticated;
