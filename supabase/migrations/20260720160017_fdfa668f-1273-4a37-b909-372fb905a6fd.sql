create policy "Anyone can upload material files"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'materials');

create policy "Anyone can view material files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'materials');

create policy "Service role can manage material files"
on storage.objects
for all
to service_role
using (bucket_id = 'materials')
with check (bucket_id = 'materials');