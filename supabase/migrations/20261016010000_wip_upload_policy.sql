-- Upload WIP langsung lewat Storage API (tanpa server action) dulu hanya dicek foldernya:
-- file bisa ditaruh di commission palsu dan tanpa batas jumlah, di luar jangkauan batas 10 & cron cleanup.
-- Sekarang: folder ke-2 wajib commission milik user, dan maksimal 10 file per folder commission.
drop policy "wip upload own folder" on storage.objects;
create policy "wip upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wip'
    and (storage.foldername(objects.name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.commissions c
      where c.id::text = (storage.foldername(objects.name))[2] and c.user_id = (select auth.uid())
    )
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'wip' and (storage.foldername(o.name))[2] = (storage.foldername(objects.name))[2]
    ) < 10
  );
