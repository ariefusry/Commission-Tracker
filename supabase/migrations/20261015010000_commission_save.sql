-- Snapshot harga dasar tipe saat dipesan (seperti commission_addons.price),
-- agar perubahan price list tidak mengubah commission lama.
alter table commissions
  add column base_price integer not null default 0 check (base_price >= 0);

-- Simpan commission + add-on dalam satu transaksi.
-- Harga dihitung di aplikasi (lib/pricing.ts); fungsi ini hanya menulis.
-- security invoker: RLS + has_access() tetap berlaku.
create or replace function save_commission(p_id uuid, p_data jsonb, p_addons jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  r public.commissions := jsonb_populate_record(null::public.commissions, p_data);
begin
  if p_id is null then
    insert into public.commissions (
      client_username, contact_platform, contact_handle, type_id, type_custom,
      start_date, deadline, stage, stage_custom, status, revision_count,
      payment_status, dp_amount, base_price, price_override, price_total,
      reference_links, notes)
    values (
      r.client_username, r.contact_platform, r.contact_handle, r.type_id, r.type_custom,
      r.start_date, r.deadline, r.stage, r.stage_custom, r.status, r.revision_count,
      r.payment_status, r.dp_amount, r.base_price, r.price_override, r.price_total,
      coalesce(r.reference_links, '{}'), r.notes)
    returning id into v_id;
  else
    update public.commissions set
      client_username = r.client_username, contact_platform = r.contact_platform,
      contact_handle = r.contact_handle, type_id = r.type_id, type_custom = r.type_custom,
      start_date = r.start_date, deadline = r.deadline, stage = r.stage,
      stage_custom = r.stage_custom, status = r.status, revision_count = r.revision_count,
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

revoke execute on function save_commission(uuid, jsonb, jsonb) from public, anon;
grant execute on function save_commission(uuid, jsonb, jsonb) to authenticated;
