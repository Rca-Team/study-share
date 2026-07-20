create policy "Anyone can update visible materials with validation"
on public.materials
for update
to anon, authenticated
using (is_hidden = false)
with check (
  char_length(trim(title)) between 3 and 200
  and subject is not null
  and class_level in ('6', '7', '8', '9', '10', '11', '12', 'JEE', 'NEET', 'College', 'Other')
  and file_type in ('pdf', 'jpg', 'jpeg', 'png', 'webp', 'ppt', 'pptx', 'doc', 'docx', 'txt', 'zip')
  and file_size >= 0
  and char_length(file_path) > 0
  and char_length(file_url) > 0
);

create policy "Anyone can delete visible materials"
on public.materials
for delete
to anon, authenticated
using (is_hidden = false);

create policy "Anyone can delete reports"
on public.reports
for delete
to anon, authenticated
using (true);