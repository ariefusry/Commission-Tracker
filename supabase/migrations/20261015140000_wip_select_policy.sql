-- Storage hanya menghapus objek yang bisa dibaca user: tanpa policy select,
-- remove() "berhasil" tanpa menghapus apa pun. Artist boleh membaca folder sendiri saja.
create policy "wip read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'wip' and (storage.foldername(name))[1] = (select auth.uid())::text);
