-- wip_object_count (security definer) menghitung file commission siapa pun yang id-nya diketahui.
-- Batasi ke folder milik pemanggil; policy upload hanya memanggilnya untuk folder sendiri.
create or replace function public.wip_object_count(p_commission text) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from storage.objects
  where bucket_id = 'wip'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = p_commission;
$$;
