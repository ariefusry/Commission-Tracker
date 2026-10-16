-- Perbaikan 20261016010000: subquery ke storage.objects di dalam policy storage.objects sendiri
-- memicu "infinite recursion detected in policy" → semua upload WIP gagal (503).
-- Hitungan file dipindah ke fungsi security definer (tidak lewat RLS, tidak rekursif).
create or replace function public.wip_object_count(p_commission text) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from storage.objects
  where bucket_id = 'wip' and (storage.foldername(name))[2] = p_commission;
$$;
revoke execute on function public.wip_object_count(text) from public, anon;
grant execute on function public.wip_object_count(text) to authenticated;

drop policy "wip upload own folder" on storage.objects;
create policy "wip upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wip'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.commissions c
      where c.id::text = (storage.foldername(name))[2] and c.user_id = (select auth.uid())
    )
    and public.wip_object_count((storage.foldername(name))[2]) < 10
  );
