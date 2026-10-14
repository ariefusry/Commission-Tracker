-- Tahap default pertama untuk user baru: "Dikonfirmasi" (status "queue" kini berlabel "Waiting list",
-- jadi tahap "Antrean" membingungkan). User lama mengganti nama sendiri di Pengaturan → Tahap.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.subscriptions (user_id, active_until)
    values (new.id, (now() at time zone 'Asia/Jakarta')::date + 6);  -- trial 7 hari termasuk hari daftar
  insert into public.settings (user_id) values (new.id);
  insert into public.commission_types (user_id, name, base_price, sort_order) values
    (new.id, 'Headshot', 50000, 1),
    (new.id, 'Bust up', 75000, 2),
    (new.id, 'Halfbody', 100000, 3),
    (new.id, 'Knee up', 125000, 4),
    (new.id, 'Full body', 150000, 5);
  insert into public.addons (user_id, name, price) values
    (new.id, 'Detailed character', 25000),
    (new.id, 'Detailed background', 50000);
  insert into public.stages (user_id, name, sort_order) values
    (new.id, 'Dikonfirmasi', 1),
    (new.id, 'Sketsa', 2),
    (new.id, 'Lineart', 3),
    (new.id, 'Coloring', 4),
    (new.id, 'Finishing', 5);
  return new;
end;
$$;
revoke execute on function handle_new_user() from public, anon, authenticated;

-- Akun demo (data fiktif) ikut memakai nama baru.
update stages set name = 'Dikonfirmasi'
where name = 'Antrean' and user_id = (select id from auth.users where email = 'demo@example.com');
