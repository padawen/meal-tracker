-- Private meal photo storage. Additive rollout: old clients keep reading
-- meal_image_url until the new application has been deployed.
alter table public.meal_records add column if not exists meal_image_path text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meal_records_image_path_owner' and conrelid = 'public.meal_records'::regclass) then
    alter table public.meal_records add constraint meal_records_image_path_owner check (
      meal_image_path is null or (
        meal_image_path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        and split_part(meal_image_path, '/', 1) = recorded_by::text
      )
    );
  end if;
end
$$;

create or replace function public.invalidate_legacy_meal_image_path()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.meal_image_url is distinct from old.meal_image_url
     and new.meal_image_path is not distinct from old.meal_image_path then
    new.meal_image_path := null;
  end if;
  if not new.had_meal then
    new.meal_image_path := null;
    new.meal_image_url := null;
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_legacy_meal_image_path() from public;
drop trigger if exists meal_records_invalidate_legacy_image on public.meal_records;
create trigger meal_records_invalidate_legacy_image
before update on public.meal_records for each row
execute function public.invalidate_legacy_meal_image_path();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists meal_photos_read_approved on storage.objects;
create policy meal_photos_read_approved on storage.objects for select to authenticated
using (bucket_id = 'meal-photos' and exists (
  select 1 from public.profiles where id = (select auth.uid()) and (is_approved or is_admin)
));

drop policy if exists meal_photos_insert_owner on storage.objects;
create policy meal_photos_insert_owner on storage.objects for insert to authenticated
with check (bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles where id = (select auth.uid()) and (is_approved or is_admin))
  and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/(full|thumbnail)\.jpg$'
);

drop policy if exists meal_photos_delete_owner on storage.objects;
create policy meal_photos_delete_owner on storage.objects for delete to authenticated
using (bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles where id = (select auth.uid()) and (is_approved or is_admin))
);
