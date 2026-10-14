-- Tahap pengerjaan bisa diatur per user (sebelumnya enum tetap).
-- Kolom lama commissions.stage / stage_custom TIDAK dihapus di sini (tidak destruktif);
-- aplikasi tidak memakainya lagi. Hapus di migration terpisah setelah dipastikan aman.

create table stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (user_id, name)
);
create index on stages (user_id);

alter table stages enable row level security;
create policy "owner with access" on stages
  for all to authenticated
  using (user_id = (select auth.uid()) and (select has_access()))
  with check (user_id = (select auth.uid()) and (select has_access()));
revoke all on stages from anon;
grant select, insert, update, delete on stages to authenticated;

-- Tahap default untuk semua user yang sudah ada.
insert into stages (user_id, name, sort_order)
select u.id, s.name, s.ord
from auth.users u
cross join (values ('Antrean', 1), ('Sketsa', 2), ('Lineart', 3), ('Coloring', 4), ('Finishing', 5)) as s(name, ord);

-- Tahap custom yang pernah dipakai ikut jadi tahap milik user tsb.
insert into stages (user_id, name, sort_order)
select distinct c.user_id, c.stage_custom, 100
from commissions c
where c.stage = 'custom' and c.stage_custom is not null
on conflict (user_id, name) do nothing;

-- Hubungkan commission ke tahap. Tahap yang dipakai tidak bisa dihapus (restrict).
alter table commissions add column stage_id uuid references stages(id) on delete restrict;
update commissions c
set stage_id = s.id
from stages s
where s.user_id = c.user_id
  and s.name = case c.stage
    when 'queue' then 'Antrean'
    when 'sketch' then 'Sketsa'
    when 'lineart' then 'Lineart'
    when 'coloring' then 'Coloring'
    when 'finishing' then 'Finishing'
    else c.stage_custom
  end;
alter table commissions alter column stage_id set not null;
create index on commissions (stage_id);

-- User baru: tambah tahap default.
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
    (new.id, 'Antrean', 1),
    (new.id, 'Sketsa', 2),
    (new.id, 'Lineart', 3),
    (new.id, 'Coloring', 4),
    (new.id, 'Finishing', 5);
  return new;
end;
$$;
revoke execute on function handle_new_user() from public, anon, authenticated;

-- save_commission menulis stage_id (bukan stage / stage_custom).
create or replace function save_commission(p_data jsonb, p_addons jsonb, p_id uuid default null)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  r public.commissions := jsonb_populate_record(null::public.commissions, p_data);
begin
  if p_id is null then
    insert into public.commissions (
      client_username, contact_platform, contact_handle, type_id, type_custom,
      start_date, deadline, stage_id, status, revision_count,
      payment_status, dp_amount, base_price, price_override, price_total,
      reference_links, notes)
    values (
      r.client_username, r.contact_platform, r.contact_handle, r.type_id, r.type_custom,
      r.start_date, r.deadline, r.stage_id, r.status, r.revision_count,
      r.payment_status, r.dp_amount, r.base_price, r.price_override, r.price_total,
      coalesce(r.reference_links, '{}'), r.notes)
    returning id into v_id;
  else
    update public.commissions set
      client_username = r.client_username, contact_platform = r.contact_platform,
      contact_handle = r.contact_handle, type_id = r.type_id, type_custom = r.type_custom,
      start_date = r.start_date, deadline = r.deadline, stage_id = r.stage_id,
      status = r.status, revision_count = r.revision_count,
      payment_status = r.payment_status, dp_amount = r.dp_amount, base_price = r.base_price,
      price_override = r.price_override, price_total = r.price_total,
      reference_links = coalesce(r.reference_links, '{}'), notes = r.notes
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'commission not found' using errcode = 'P0002';
    end if;
    delete from public.commission_addons where commission_id = v_id;
  end if;

  insert into public.commission_addons (commission_id, addon_id, custom_name, price)
  select v_id, a.addon_id, a.custom_name, a.price
  from jsonb_to_recordset(coalesce(p_addons, '[]')) as a(addon_id uuid, custom_name text, price integer);

  return v_id;
end;
$$;
