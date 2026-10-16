-- Uji antrean di get_tracking + trigger completed_at. Transaksi di-ROLLBACK.
begin;

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'queue-a@test.local', 'authenticated', 'authenticated');

-- 4 commission aktif (urutan tanggal mulai: q1, q2, q3, q4), 1 selesai, 1 batal.
insert into public.commissions (user_id, client_username, type_custom, stage_id, tracking_code, start_date, status)
select '00000000-0000-0000-0000-00000000000a', v.name, 'X',
       (select id from public.stages where user_id = '00000000-0000-0000-0000-00000000000a' and name = v.stage),
       v.code, v.start::date, v.status::public.commission_status
from (values
  ('rahasia-1', 'aaaa0001aaaa0001', '2026-09-01', 'in_progress', 'Coloring'),
  ('rahasia-2', 'aaaa0002aaaa0002', '2026-09-05', 'revision',    'Sketsa'),
  ('saya',      'aaaa0003aaaa0003', '2026-09-10', 'queue',       'Dikonfirmasi'),
  ('rahasia-4', 'aaaa0004aaaa0004', '2026-09-20', 'queue',       'Dikonfirmasi'),
  ('selesai',   'aaaa0005aaaa0005', '2026-08-01', 'done',        'Finishing'),
  ('batal',     'aaaa0006aaaa0006', '2026-08-02', 'cancelled',   'Sketsa')
) as v(name, code, start, status, stage);

do $$
declare r record;
begin
  -- Trigger: insert langsung "done" → completed_at terisi; batal → null.
  if (select completed_at from public.commissions where tracking_code = 'aaaa0005aaaa0005') is null then raise exception 'completed_at tidak terisi saat insert done'; end if;
  if (select completed_at from public.commissions where tracking_code = 'aaaa0006aaaa0006') is not null then raise exception 'completed_at terisi untuk batal'; end if;

  -- Update ke done → terisi; dibuka lagi → null.
  update public.commissions set status = 'done' where tracking_code = 'aaaa0004aaaa0004';
  if (select completed_at from public.commissions where tracking_code = 'aaaa0004aaaa0004') is null then raise exception 'completed_at tidak terisi saat update done'; end if;
  update public.commissions set status = 'queue' where tracking_code = 'aaaa0004aaaa0004';
  if (select completed_at from public.commissions where tracking_code = 'aaaa0004aaaa0004') is not null then raise exception 'completed_at tidak dikosongkan'; end if;
end $$;

set local role anon;

do $$
declare r record;
begin
  select * into r from public.get_tracking('aaaa0003aaaa0003');
  if r.queue_position is distinct from 3 then raise exception 'posisi salah: %', r.queue_position; end if;
  if r.queue_total is distinct from 4 then raise exception 'total salah: %', r.queue_total; end if;
  -- 'saya' antre ke-1 (rahasia-1 & -2 sedang dikerjakan), dari 2 yang antre.
  if r.wait_position is distinct from 1 then raise exception 'posisi antre salah: %', r.wait_position; end if;
  if r.wait_total is distinct from 2 then raise exception 'total antre salah: %', r.wait_total; end if;
  if r.slot_limit is distinct from 5 then raise exception 'slot_limit salah: %', r.slot_limit; end if;
  if jsonb_array_length(r.queue) <> 4 then raise exception 'isi papan antrean salah: %', r.queue; end if;
  if r.queue::text ~ 'rahasia' then raise exception 'nama client lain bocor: %', r.queue; end if;
  if r.queue::text ~ 'aaaa000' then raise exception 'kode tracking lain bocor'; end if;
  if (r.queue -> 0 ->> 'stage') <> 'Coloring' or (r.queue -> 0 ->> 'status') <> 'in_progress' then raise exception 'urutan/tahap salah: %', r.queue; end if;
  if not (r.queue -> 2 ->> 'you')::boolean then raise exception 'posisi kamu tidak ditandai'; end if;
  if array_length(r.recent_completions, 1) <> 1 then raise exception 'riwayat selesai salah: %', r.recent_completions; end if;

  -- Yang sedang dikerjakan tidak punya posisi antre.
  select * into r from public.get_tracking('aaaa0002aaaa0002');
  if r.wait_position is not null or r.queue_position is distinct from 2 then raise exception 'commission dikerjakan: posisi salah'; end if;

  -- Commission selesai: tanpa antrean.
  select * into r from public.get_tracking('aaaa0005aaaa0005');
  if r.queue_position is not null or r.queue is not null then raise exception 'commission selesai masih menampilkan antrean'; end if;
end $$;

-- Prioritas manual: rahasia-4 didahulukan di atas 'saya'.
reset role;
update public.commissions set queue_order = (select queue_order from public.commissions where tracking_code = 'aaaa0003aaaa0003') - 1
where tracking_code = 'aaaa0004aaaa0004';
set local role anon;
do $$
declare r record;
begin
  select * into r from public.get_tracking('aaaa0003aaaa0003');
  if r.wait_position is distinct from 2 then raise exception 'prioritas manual diabaikan: wait %', r.wait_position; end if;
  if r.queue_position is distinct from 4 then raise exception 'prioritas manual diabaikan: pos %', r.queue_position; end if;
end $$;

-- Commission baru masuk paling bawah.
reset role;
do $$ begin
  insert into public.commissions (user_id, client_username, type_custom, stage_id, tracking_code)
  values ('00000000-0000-0000-0000-00000000000a', 'baru', 'X',
          (select id from public.stages where user_id = '00000000-0000-0000-0000-00000000000a' limit 1), 'aaaa0007aaaa0007');
  if (select queue_order from public.commissions where tracking_code = 'aaaa0007aaaa0007')
     <= (select max(queue_order) from public.commissions where tracking_code <> 'aaaa0007aaaa0007' and user_id = '00000000-0000-0000-0000-00000000000a')
  then raise exception 'commission baru tidak di urutan paling bawah'; end if;
end $$;

-- Artist menyembunyikan antrean.
reset role;
update public.settings set show_queue = false where user_id = '00000000-0000-0000-0000-00000000000a';
set local role anon;
do $$
declare r record;
begin
  select * into r from public.get_tracking('aaaa0003aaaa0003');
  if r.client_username is distinct from 'saya' then raise exception 'tracking dasar hilang'; end if;
  if r.queue_position is not null or r.queue is not null or r.recent_completions is not null then raise exception 'antrean tetap tampil saat disembunyikan'; end if;
end $$;

reset role;
select 'queue OK' as result;
rollback;
