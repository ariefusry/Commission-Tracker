-- Aplikasi gratis (didukung donasi): akses data cukup dengan login.
-- Isolasi data per user TETAP lewat policy `user_id = auth.uid()`; fungsi ini hanya
-- menghapus syarat langganan aktif. Tabel subscriptions dibiarkan (tidak dipakai).
create or replace function has_access() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null;
$$;
