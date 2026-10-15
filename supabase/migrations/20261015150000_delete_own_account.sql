-- User menghapus akunnya sendiri beserta semua datanya.
-- Commission dihapus dulu: stages dilindungi `on delete restrict` dari commissions/wip_images,
-- jadi cascade dari auth.users saja bisa gagal. File WIP di Storage dihapus server action
-- lebih dulu lewat Storage API (cascade tidak menyentuh Storage).
create or replace function public.delete_own_account()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from public.commissions where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
