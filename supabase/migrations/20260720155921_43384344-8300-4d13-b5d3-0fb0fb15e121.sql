create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.increment_material_views(uuid) from public;
revoke execute on function public.increment_material_downloads(uuid) from public;
revoke execute on function public.increment_material_likes(uuid) from public;

grant execute on function public.increment_material_views(uuid) to service_role;
grant execute on function public.increment_material_downloads(uuid) to service_role;
grant execute on function public.increment_material_likes(uuid) to service_role;