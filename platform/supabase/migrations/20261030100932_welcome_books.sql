create table public.welcome_book_drafts (
 place_id uuid primary key references public.contributions(id) on delete cascade,
 entitled boolean not null default false,
 title text not null default 'Bienvenue chez nous' check(length(trim(title)) between 3 and 100),
 content jsonb not null default '{}',
 version integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.welcome_books (
 place_id uuid primary key references public.contributions(id) on delete cascade,
 title text not null,
 content jsonb not null,
 published_version integer not null,
 published_at timestamptz not null default now()
);
create function private.manages_welcome_book(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.contributions c
 join private.verified_place_management v on v.contribution_id=c.id and v.organization_id=c.organization_id
 where c.id=p_id and c.category='Hébergements' and private.can_edit_contribution(c.author_id,c.organization_id));
$$;
create function private.welcome_book_available(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.welcome_book_drafts d join public.places p on p.id=d.place_id
 join public.contributions c on c.id=p.id
 join private.verified_place_management v on v.contribution_id=c.id and v.organization_id=c.organization_id
 where d.place_id=p_id and d.entitled and p.category='Hébergements');
$$;
revoke all on function private.manages_welcome_book(uuid),private.welcome_book_available(uuid) from public;
grant execute on function private.manages_welcome_book(uuid) to authenticated;
grant execute on function private.welcome_book_available(uuid) to anon,authenticated;
alter table public.welcome_book_drafts enable row level security;
alter table public.welcome_books enable row level security;
revoke all on public.welcome_book_drafts,public.welcome_books from public,anon,authenticated;
grant select on public.welcome_book_drafts to authenticated;
grant select on public.welcome_books to anon,authenticated;
create policy welcome_drafts_managed on public.welcome_book_drafts for select to authenticated using(private.manages_welcome_book(place_id));
create policy welcome_books_public on public.welcome_books for select to anon,authenticated using(private.welcome_book_available(place_id));

create function private.save_welcome_book(p_id uuid,p_version integer,p_title text,p_content jsonb)
returns public.welcome_book_drafts language plpgsql security definer set search_path='' as $$
declare d public.welcome_book_drafts; entry record;
begin
 select * into d from public.welcome_book_drafts where place_id=p_id for update;
 if not found or not private.manages_welcome_book(p_id) or not d.entitled then raise exception 'Livret non autorisé' using errcode='42501'; end if;
 if d.version is distinct from p_version then raise exception 'Le livret a changé. Actualisez avant de réessayer.' using errcode='40001'; end if;
 if p_content is null or jsonb_typeof(p_content)<>'object' or octet_length(p_content::text)>80000 then raise exception 'Contenu invalide' using errcode='22023'; end if;
 for entry in select * from jsonb_each(p_content) loop
  if entry.key not in ('welcome','arrival','departure','stay','house','rooms','discover','nature','activities','food','favorites','kids','checkout','contacts')
   or jsonb_typeof(entry.value)<>'string' or length(entry.value#>>'{}')>5000 then raise exception 'Rubrique invalide ou trop longue' using errcode='22023'; end if;
 end loop;
 update public.welcome_book_drafts set title=trim(p_title),content=p_content,version=version+1,updated_at=now() where place_id=p_id returning * into d;
 insert into private.contribution_audit(contribution_id,actor_id,action,version) values(p_id,auth.uid(),'welcome_book_saved',d.version);
 return d;
end; $$;
create function private.publish_welcome_book(p_id uuid,p_version integer,p_publish boolean)
returns void language plpgsql security definer set search_path='' as $$
declare d public.welcome_book_drafts;
begin
 select * into d from public.welcome_book_drafts where place_id=p_id for update;
 if not found or not private.manages_welcome_book(p_id) then raise exception 'Livret non autorisé' using errcode='42501'; end if;
 if d.version is distinct from p_version then raise exception 'Le livret a changé. Actualisez avant de réessayer.' using errcode='40001'; end if;
 if p_publish then
  if not private.welcome_book_available(p_id) then raise exception 'Extension ou fiche indisponible' using errcode='42501'; end if;
  if length(trim(coalesce(d.content->>'welcome','')))<12 then raise exception 'Ajoutez un message de bienvenue avant publication' using errcode='22023'; end if;
  insert into public.welcome_books(place_id,title,content,published_version) values(p_id,d.title,d.content,d.version)
   on conflict(place_id) do update set title=excluded.title,content=excluded.content,published_version=excluded.published_version,published_at=now();
 else delete from public.welcome_books where place_id=p_id;
 end if;
 insert into private.contribution_audit(contribution_id,actor_id,action,version) values(p_id,auth.uid(),case when p_publish then 'welcome_book_published' else 'welcome_book_withdrawn' end,d.version);
end; $$;
create function public.save_welcome_book(p_id uuid,p_version integer,p_title text,p_content jsonb)
returns public.welcome_book_drafts language sql security invoker set search_path='' as $$select * from private.save_welcome_book(p_id,p_version,p_title,p_content);$$;
create function public.publish_welcome_book(p_id uuid,p_version integer,p_publish boolean)
returns void language sql security invoker set search_path='' as $$select private.publish_welcome_book(p_id,p_version,p_publish);$$;
revoke all on function private.save_welcome_book(uuid,integer,text,jsonb),public.save_welcome_book(uuid,integer,text,jsonb),private.publish_welcome_book(uuid,integer,boolean),public.publish_welcome_book(uuid,integer,boolean) from public,anon;
grant execute on function private.save_welcome_book(uuid,integer,text,jsonb),public.save_welcome_book(uuid,integer,text,jsonb),private.publish_welcome_book(uuid,integer,boolean),public.publish_welcome_book(uuid,integer,boolean) to authenticated;
