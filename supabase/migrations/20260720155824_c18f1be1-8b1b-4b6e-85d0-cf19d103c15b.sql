create extension if not exists pg_trgm;

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject text not null,
  class_level text not null,
  tags text[] not null default '{}',
  uploader_name text,
  file_path text not null,
  file_url text not null,
  thumbnail_url text,
  file_type text not null,
  file_size bigint not null default 0,
  downloads bigint not null default 0,
  views bigint not null default 0,
  likes bigint not null default 0,
  is_pinned boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.materials to anon;
grant select, insert, update, delete on public.materials to authenticated;
grant all on public.materials to service_role;

alter table public.materials enable row level security;

create policy "Anyone can view visible materials"
on public.materials
for select
to anon, authenticated
using (is_hidden = false);

create policy "Anyone can upload materials"
on public.materials
for insert
to anon, authenticated
with check (true);

create policy "Anyone can update visible materials"
on public.materials
for update
to anon, authenticated
using (is_hidden = false)
with check (true);

create policy "Anyone can delete visible materials"
on public.materials
for delete
to anon, authenticated
using (is_hidden = false);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  username text,
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.comments to anon;
grant select, insert, update, delete on public.comments to authenticated;
grant all on public.comments to service_role;

alter table public.comments enable row level security;

create policy "Anyone can view comments"
on public.comments
for select
to anon, authenticated
using (true);

create policy "Anyone can add comments"
on public.comments
for insert
to anon, authenticated
with check (true);

create policy "Anyone can edit comments"
on public.comments
for update
to anon, authenticated
using (true)
with check (true);

create policy "Anyone can delete comments"
on public.comments
for delete
to anon, authenticated
using (true);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  reason text not null,
  reporter_name text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.reports to anon;
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;

alter table public.reports enable row level security;

create policy "Anyone can file reports"
on public.reports
for insert
to anon, authenticated
with check (true);

create policy "Anyone can view reports"
on public.reports
for select
to anon, authenticated
using (true);

create policy "Anyone can update reports"
on public.reports
for update
to anon, authenticated
using (true)
with check (true);

create policy "Anyone can delete reports"
on public.reports
for delete
to anon, authenticated
using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_materials_updated_at
before update on public.materials
for each row execute function public.set_updated_at();

create trigger set_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create or replace function public.increment_material_views(material_uuid uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_count bigint;
begin
  update public.materials
  set views = views + 1
  where id = material_uuid and is_hidden = false
  returning views into new_count;

  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.increment_material_views(uuid) to anon, authenticated;

create or replace function public.increment_material_downloads(material_uuid uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_count bigint;
begin
  update public.materials
  set downloads = downloads + 1
  where id = material_uuid and is_hidden = false
  returning downloads into new_count;

  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.increment_material_downloads(uuid) to anon, authenticated;

create or replace function public.increment_material_likes(material_uuid uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_count bigint;
begin
  update public.materials
  set likes = likes + 1
  where id = material_uuid and is_hidden = false
  returning likes into new_count;

  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.increment_material_likes(uuid) to anon, authenticated;

create index materials_created_at_idx on public.materials (created_at desc);
create index materials_downloads_idx on public.materials (downloads desc);
create index materials_views_idx on public.materials (views desc);
create index materials_likes_idx on public.materials (likes desc);
create index materials_subject_idx on public.materials (subject);
create index materials_class_level_idx on public.materials (class_level);
create index materials_file_type_idx on public.materials (file_type);
create index materials_pinned_idx on public.materials (is_pinned desc, created_at desc);
create index materials_tags_gin_idx on public.materials using gin (tags);
create index materials_title_trgm_idx on public.materials using gin (title gin_trgm_ops);
create index materials_description_trgm_idx on public.materials using gin (description gin_trgm_ops);

create index comments_material_id_created_at_idx on public.comments (material_id, created_at desc);
create index reports_material_id_created_at_idx on public.reports (material_id, created_at desc);

alter publication supabase_realtime add table public.materials;