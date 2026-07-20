drop policy if exists "Anyone can delete reports" on public.reports;

create policy "Anyone can delete reports for existing materials"
on public.reports
for delete
to anon, authenticated
using (
  exists (
    select 1 from public.materials m
    where m.id = material_id
  )
);