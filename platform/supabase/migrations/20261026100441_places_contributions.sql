-- Additive migration. Existing organizations and their memberships are retained.
-- Public snapshots contain no contributor identity, organization or review notes.
create table private.editorial_reviewers (
 user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.editorial_reviewers from public, anon, authenticated;
alter table private.editorial_reviewers enable row level security;

create table public.contributions (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null default auth.uid() references auth.users(id),
 last_editor_id uuid not null default auth.uid() references auth.users(id),
 organization_id uuid references public.organizations(id),
 name text not null check (length(trim(name)) between 3 and 100),
 category text not null check (category in ('Restaurants & cafés','Hébergements','Producteurs locaux','Artisans & commerces','Nature & randonnée','Patrimoine & culture','Événements & sorties','Activités & loisirs')),
 town text not null check (length(trim(town)) between 1 and 80),
 description text not null check (length(trim(description)) between 12 and 1000),
 details text not null default '' check (length(details) <= 5000),
 status text not null default 'draft' check (status in ('draft','submitted','validated','published','rejected')),
 version integer not null default 1,
 review_note text not null default '' check (length(review_note) <= 2000),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index contributions_author_idx on public.contributions(author_id);
create index contributions_org_idx on public.contributions(organization_id);
create index contributions_status_idx on public.contributions(status);

create table public.places (
 id uuid primary key references public.contributions(id),
 name text not null,
 category text not null,
 town text not null,
 description text not null,
 details text not null,
 published_at timestamptz not null default now()
);
create table private.contribution_audit (
 id bigint generated always as identity primary key,
 contribution_id uuid not null,
 actor_id uuid not null,
 action text not null,
 version integer not null,
 created_at timestamptz not null default now()
);
revoke all on private.contribution_audit from public, anon, authenticated;
alter table private.contribution_audit enable row level security;

create function private.can_review_contributions(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and (
  exists(select 1 from private.editorial_reviewers where user_id = auth.uid())
  or private.is_org_manager(p_org)
 );
$$;
create function private.can_edit_contribution(p_author uuid, p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and (
  (p_org is null and p_author = auth.uid()) or
  exists(select 1 from public.organization_members
    where organization_id = p_org and user_id = auth.uid() and role in ('owner','admin','editor'))
 );
$$;
revoke all on function private.can_review_contributions(uuid), private.can_edit_contribution(uuid,uuid) from public, anon;
grant execute on function private.can_review_contributions(uuid), private.can_edit_contribution(uuid,uuid) to authenticated;

alter table public.contributions enable row level security;
alter table public.places enable row level security;
revoke all on public.contributions, public.places from public, anon, authenticated;
grant select on public.contributions to authenticated;
grant select on public.places to anon, authenticated;
create policy places_public_read on public.places for select to anon, authenticated using (true);
create policy contributions_private_read on public.contributions for select to authenticated using (
 (organization_id is null and author_id = (select auth.uid()))
 or private.is_org_member(organization_id)
 or private.can_review_contributions(organization_id)
);
-- No direct writes: RPCs below explicitly enforce permissions, transitions and version locks.
create function public.can_review_contributions(p_organization_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
 select private.can_review_contributions(p_organization_id);
$$;

create function public.save_contribution(
 p_id uuid, p_expected_version integer, p_organization_id uuid,
 p_name text, p_category text, p_town text, p_description text, p_details text
) returns public.contributions language plpgsql security definer set search_path = '' as $$
declare c public.contributions;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if p_id is null then
  if not private.can_edit_contribution(auth.uid(), p_organization_id) then
   raise exception 'Contribution forbidden' using errcode = '42501';
  end if;
  insert into public.contributions(author_id, organization_id, name, category, town, description, details)
   values(auth.uid(), p_organization_id, trim(p_name), p_category, trim(p_town), trim(p_description), trim(p_details)) returning * into c;
 else
  select * into c from public.contributions where id = p_id for update;
  if not found or not private.can_edit_contribution(c.author_id, c.organization_id) then
   raise exception 'Contribution forbidden' using errcode = '42501';
  end if;
  if p_expected_version is distinct from c.version then raise exception 'Stale contribution version' using errcode = '40001'; end if;
  if c.status not in ('draft','rejected') then raise exception 'Only a draft can be edited' using errcode = '22023'; end if;
  if p_organization_id is distinct from c.organization_id then raise exception 'Organization is immutable' using errcode = '22023'; end if;
  update public.contributions set name = trim(p_name), category = p_category, town = trim(p_town),
   description = trim(p_description), details = trim(p_details), status = 'draft',
   last_editor_id = auth.uid(), reviewed_by = null, reviewed_at = null, review_note = '', version = version + 1, updated_at = now()
   where id = p_id returning * into c;
 end if;
 insert into private.contribution_audit(contribution_id,actor_id,action,version) values(c.id,auth.uid(),'saved',c.version);
 return c;
end;
$$;

create function public.transition_contribution(p_id uuid, p_expected_version integer, p_action text, p_note text default '')
returns public.contributions language plpgsql security definer set search_path = '' as $$
declare c public.contributions; next_status text; can_edit boolean; can_review boolean;
begin
 select * into c from public.contributions where id = p_id for update;
 if not found or auth.uid() is null then raise exception 'Contribution forbidden' using errcode = '42501'; end if;
 can_edit := private.can_edit_contribution(c.author_id,c.organization_id);
 can_review := private.can_review_contributions(c.organization_id);
 if not (can_edit or can_review) then raise exception 'Contribution forbidden' using errcode = '42501'; end if;
 if p_expected_version is distinct from c.version then raise exception 'Stale contribution version' using errcode = '40001'; end if;
 case p_action
  when 'submit' then
   if not can_edit or c.status not in ('draft','rejected') then raise exception 'Submission forbidden' using errcode = '42501'; end if;
   next_status := 'submitted';
  when 'revise' then
   if not can_edit or c.status not in ('submitted','validated','published','rejected') then raise exception 'Revision forbidden' using errcode = '42501'; end if;
   next_status := 'draft';
  when 'validate' then
   if not can_review or auth.uid() in (c.author_id,c.last_editor_id) or c.status <> 'submitted' then raise exception 'Validation forbidden' using errcode = '42501'; end if;
   next_status := 'validated';
  when 'reject' then
   if not can_review or auth.uid() in (c.author_id,c.last_editor_id) or c.status not in ('submitted','validated') then raise exception 'Rejection forbidden' using errcode = '42501'; end if;
   if length(trim(coalesce(p_note,''))) = 0 then raise exception 'Review note required' using errcode = '22023'; end if;
   next_status := 'rejected';
  when 'publish' then
   if not can_review or auth.uid() in (c.author_id,c.last_editor_id) or c.status <> 'validated' then raise exception 'Publication forbidden' using errcode = '42501'; end if;
   next_status := 'published';
   insert into public.places(id,name,category,town,description,details)
    values(c.id,c.name,c.category,c.town,c.description,c.details)
    on conflict(id) do update set name=excluded.name,category=excluded.category,town=excluded.town,
     description=excluded.description,details=excluded.details,published_at=now();
  when 'unpublish' then
   if not can_review or not exists(select 1 from public.places where id=c.id) then raise exception 'Withdrawal forbidden' using errcode = '42501'; end if;
   delete from public.places where id=c.id;
   next_status := 'draft';
  else raise exception 'Unknown transition' using errcode = '22023';
 end case;
 update public.contributions set status=next_status, version=version+1, updated_at=now(),
  review_note=case when p_action in ('validate','reject') then coalesce(trim(p_note),'') when next_status in ('draft','submitted') then '' else review_note end,
  reviewed_by=case when p_action in ('validate','reject') then auth.uid() when next_status in ('draft','submitted') then null else reviewed_by end,
  reviewed_at=case when p_action in ('validate','reject') then now() when next_status in ('draft','submitted') then null else reviewed_at end
  where id=c.id returning * into c;
 insert into private.contribution_audit(contribution_id,actor_id,action,version) values(c.id,auth.uid(),p_action,c.version);
 return c;
end;
$$;

create function public.delete_contribution(p_id uuid, p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.contributions;
begin
 select * into c from public.contributions where id=p_id for update;
 if not found or not private.can_edit_contribution(c.author_id,c.organization_id) then raise exception 'Deletion forbidden' using errcode = '42501'; end if;
 if p_expected_version is distinct from c.version then raise exception 'Stale contribution version' using errcode = '40001'; end if;
 if c.status not in ('draft','rejected') or exists(select 1 from public.places where id=c.id) then
  raise exception 'Withdraw publication and return to draft before deleting' using errcode = '22023';
 end if;
 insert into private.contribution_audit(contribution_id,actor_id,action,version) values(c.id,auth.uid(),'deleted',c.version);
 delete from public.contributions where id=c.id;
end;
$$;

revoke all on function public.can_review_contributions(uuid),
 public.save_contribution(uuid,integer,uuid,text,text,text,text,text),
 public.transition_contribution(uuid,integer,text,text), public.delete_contribution(uuid,integer)
 from public, anon;
grant execute on function public.can_review_contributions(uuid),
 public.save_contribution(uuid,integer,uuid,text,text,text,text,text),
 public.transition_contribution(uuid,integer,text,text), public.delete_contribution(uuid,integer)
 to authenticated;
