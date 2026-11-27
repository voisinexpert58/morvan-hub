alter table public.welcome_book_drafts add column photo_paths text[] not null default '{}'
 check(cardinality(photo_paths)<=5 and array_position(photo_paths,null) is null);
alter table public.welcome_books add column photo_paths text[] not null default '{}';
create index welcome_draft_photos_idx on public.welcome_book_drafts using gin(photo_paths);
create index welcome_public_photos_idx on public.welcome_books using gin(photo_paths);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('welcome-photos','welcome-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy welcome_photos_upload on storage.objects for insert to authenticated with check(
 bucket_id='welcome-photos' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
 and exists(select 1 from public.welcome_book_drafts d where d.place_id::text=split_part(storage.objects.name,'/',1) and d.entitled and private.manages_welcome_book(d.place_id))
);
create policy welcome_photos_read_public on storage.objects for select to anon,authenticated using(
 bucket_id='welcome-photos' and exists(select 1 from public.welcome_books b where b.photo_paths @> array[storage.objects.name])
);
create policy welcome_photos_read_private on storage.objects for select to authenticated using(
 bucket_id='welcome-photos' and exists(select 1 from public.welcome_book_drafts d where d.photo_paths @> array[storage.objects.name])
);
-- Immutable files. Removing an association does not delete its stored object.
create function private.set_welcome_photos(p_id uuid,p_version integer,p_paths text[])
returns public.welcome_book_drafts language plpgsql security definer set search_path='' as $$
declare d public.welcome_book_drafts; path text;
begin
 select * into d from public.welcome_book_drafts where place_id=p_id for update;
 if not found or not private.manages_welcome_book(p_id) or not d.entitled then raise exception 'Livret non autorisé' using errcode='42501'; end if;
 if d.version is distinct from p_version then raise exception 'Le livret a changé. Actualisez.' using errcode='40001'; end if;
 if p_paths is null or cardinality(p_paths)>5 or array_position(p_paths,null) is not null or cardinality(p_paths)<>(select count(distinct item) from unnest(p_paths) item) then raise exception 'Cinq photos distinctes maximum' using errcode='22023'; end if;
 foreach path in array p_paths loop
  if split_part(path,'/',1)<>p_id::text or not exists(select 1 from storage.objects o where o.bucket_id='welcome-photos' and o.name=path) then raise exception 'Photo étrangère au livret ou introuvable' using errcode='22023'; end if;
 end loop;
 update public.welcome_book_drafts set photo_paths=p_paths,version=version+1,updated_at=now() where place_id=p_id returning * into d;
 insert into private.contribution_audit(contribution_id,actor_id,action,version) values(p_id,auth.uid(),'welcome_photos_saved',d.version);
 return d;
end; $$;
create function public.set_welcome_photos(p_id uuid,p_version integer,p_paths text[])
returns public.welcome_book_drafts language sql security invoker set search_path='' as $$select * from private.set_welcome_photos(p_id,p_version,p_paths);$$;
revoke all on function private.set_welcome_photos(uuid,integer,text[]),public.set_welcome_photos(uuid,integer,text[]) from public,anon;
grant execute on function private.set_welcome_photos(uuid,integer,text[]),public.set_welcome_photos(uuid,integer,text[]) to authenticated;
create function private.copy_welcome_photos() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select photo_paths into new.photo_paths from public.welcome_book_drafts where place_id=new.place_id;
 return new;
end; $$;
revoke all on function private.copy_welcome_photos() from public,anon,authenticated;
create trigger copy_welcome_photos before insert or update on public.welcome_books for each row execute function private.copy_welcome_photos();
