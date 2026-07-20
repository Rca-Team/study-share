drop policy if exists "Anyone can update visible materials" on public.materials;
drop policy if exists "Anyone can delete visible materials" on public.materials;

drop policy if exists "Anyone can edit comments" on public.comments;
drop policy if exists "Anyone can delete comments" on public.comments;

drop policy if exists "Anyone can update reports" on public.reports;
drop policy if exists "Anyone can delete reports" on public.reports;

create policy "Anyone can upload validated materials"
on public.materials
for insert
to anon, authenticated
with check (
  char_length(trim(title)) between 3 and 200
  and subject is not null
  and class_level in ('6', '7', '8', '9', '10', '11', '12', 'JEE', 'NEET', 'College', 'Other')
  and file_type in ('pdf', 'jpg', 'jpeg', 'png', 'webp', 'ppt', 'pptx', 'doc', 'docx', 'txt', 'zip')
  and file_size >= 0
  and char_length(file_path) > 0
  and char_length(file_url) > 0
);

drop policy if exists "Anyone can upload materials" on public.materials;

create policy "Service role can manage materials"
on public.materials
for all
to service_role
using (true)
with check (true);

create policy "Anyone can add validated comments"
on public.comments
for insert
to anon, authenticated
with check (
  material_id is not null
  and char_length(trim(comment)) between 1 and 1000
  and exists (
    select 1 from public.materials m
    where m.id = material_id and m.is_hidden = false
  )
);

drop policy if exists "Anyone can add comments" on public.comments;

create policy "Service role can manage comments"
on public.comments
for all
to service_role
using (true)
with check (true);

create policy "Anyone can file validated reports"
on public.reports
for insert
to anon, authenticated
with check (
  material_id is not null
  and char_length(trim(reason)) between 5 and 500
  and exists (
    select 1 from public.materials m
    where m.id = material_id
  )
);

drop policy if exists "Anyone can file reports" on public.reports;

create policy "Service role can manage reports"
on public.reports
for all
to service_role
using (true)
with check (true);