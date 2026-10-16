-- Aplikasi gratis (didukung donasi): tabel langganan tidak dipakai lagi.
-- Trigger user baru dibuat ulang tanpa baris langganan SEBELUM tabelnya dihapus,
-- supaya pendaftaran tidak gagal.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
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

drop table public.subscriptions;
