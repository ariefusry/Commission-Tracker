-- Hapus kolom tahap lama (enum) setelah semua commission memakai stage_id.
-- Pengaman: batal jika masih ada commission tanpa stage_id atau wip_images berisi data.
do $$
begin
  if exists (select 1 from public.commissions where stage_id is null) then
    raise exception 'masih ada commission tanpa stage_id';
  end if;
  if exists (select 1 from public.wip_images) then
    raise exception 'wip_images berisi data, migrasi stage manual dulu';
  end if;
end $$;

-- Check constraint (stage/stage_custom) ikut terhapus bersama kolomnya.
alter table commissions drop column stage, drop column stage_custom;

-- wip_images (Fase 2, masih kosong) ikut memakai tahap milik user.
alter table wip_images drop column stage;
alter table wip_images add column stage_id uuid not null references stages(id) on delete restrict;

drop type commission_stage;
