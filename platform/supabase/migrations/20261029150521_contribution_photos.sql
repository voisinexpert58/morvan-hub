-- Immutable private uploads; only publication snapshots make photos readable by visitors.
alter table public.contributions add column photo_paths text[] not null default '{}'
 check (cardinality(photo_paths) <= 5 and array_position(photo_paths, null) is null);
alter table public.places add column photo_paths text[] not null default '{}';
create index contributions_photo_paths_idx on public.contributions using gin(photo_paths);
create index places_photo_paths_idx on public.places using gin(photo_paths);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('place-photos','place-photos',false,5242880,array['image/jpeg','image/png','image/webp']);

create policy place_photos_upload on storage.objects for insert to authenticated
 with check (
  bucket_id='place-photos'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  and exists(select 1 from public.contributions c
   where c.id::text=split_part(storage.objects.name,'/',1) and c.status in ('draft','rejected')
   and private.can_edit_contribution(c.author_id,c.organization_id))
 );
create policy place_photos_public_read on storage.objects for select to anon,authenticated
 using (bucket_id='place-photos' and exists(
  select 1 from public.places p where p.photo_paths @> array[storage.objects.name]
 ));
create policy place_photos_private_read on storage.objects for select to authenticated
 using (bucket_id='place-photos' and exists(
  -- The contribution's SELECT RLS also applies to this lookup.
  select 1 from public.contributions c where c.photo_paths @> array[storage.objects.name]
 ));
-- No UPDATE/DELETE policies: objects cannot be overwritten after validation.
-- Unreferenced uploads stay inaccessible; administrative cleanup must use Storage API.

create function private.set_contribution_photos(p_id uuid,p_expected_version integer,p_paths text[])
returns public.contributions language plpgsql security definer set search_path='' as $$
declare c public.contributions; path text;
begin
 select * into c from public.contributions where id=p_id for update;
 if not found or auth.uid() is null or not private.can_edit_contribution(c.author_id,c.organization_id) then
  raise exception 'Photo modification forbidden' using errcode='42501';
 end if;
 if c.version is distinct from p_expected_version then raise exception 'Stale contribution version' using errcode='40001'; end if;
 if c.status not in ('draft','rejected') then raise exception 'Only draft photos can be changed' using errcode='22023'; end if;
 if p_paths is null or cardinality(p_paths)>5 or array_position(p_paths,null) is not null
  or cardinality(p_paths) <> (select count(distinct item) from unnest(p_paths) item) then
  raise exception 'Up to five distinct photos are allowed' using errcode='22023';
 end if;
 foreach path in array p_paths loop
  if split_part(path,'/',1) <> c.id::text or not exists(
   select 1 from storage.objects o where o.bucket_id='place-photos' and o.name=path
  ) then raise exception 'Photo not uploaded for this contribution' using errcode='22023'; end if;
 end loop;
 update public.contributions set photo_paths=p_paths,status='draft',version=version+1,
  last_editor_id=auth.uid(),reviewed_by=null,reviewed_at=null,review_note='',updated_at=now()
  where id=c.id returning * into c;
 insert into private.contribution_audit(contribution_id,actor_id,action,version)
  values(c.id,auth.uid(),'photos_updated',c.version);
 return c;
end;
$$;
revoke all on function private.set_contribution_photos(uuid,integer,text[]) from public,anon;
grant execute on function private.set_contribution_photos(uuid,integer,text[]) to authenticated;

create function public.set_contribution_photos(p_id uuid,p_expected_version integer,p_paths text[])
returns public.contributions language sql security invoker set search_path='' as $$
 select * from private.set_contribution_photos(p_id,p_expected_version,p_paths);
$$;
revoke all on function public.set_contribution_photos(uuid,integer,text[]) from public,anon;
grant execute on function public.set_contribution_photos(uuid,integer,text[]) to authenticated;

create function private.copy_place_photos()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 select photo_paths into new.photo_paths from public.contributions where id=new.id;
 return new;
end;
$$;
revoke all on function private.copy_place_photos() from public,anon,authenticated;
create trigger copy_place_photos before insert or update on public.places
 for each row execute function private.copy_place_photos();
