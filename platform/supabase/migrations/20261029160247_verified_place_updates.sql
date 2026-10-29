-- A verification belongs to one establishment, never to an entire user account.
create table private.verified_place_management (
 contribution_id uuid primary key references public.contributions(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 verified_by uuid not null references auth.users(id),
 verified_at timestamptz not null default now()
);
alter table private.verified_place_management enable row level security;
revoke all on private.verified_place_management from public,anon,authenticated;

create function private.can_publish_place_update(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.contributions c
  join private.verified_place_management v on v.contribution_id=c.id and v.organization_id=c.organization_id
  join public.places p on p.id=c.id
  where c.id=p_id and c.status='draft'
   and private.can_edit_contribution(c.author_id,c.organization_id)
   and (c.name,c.category,c.town) is not distinct from (p.name,p.category,p.town)
 );
$$;
create function public.can_publish_place_update(p_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select private.can_publish_place_update(p_id);
$$;

create function private.publish_place_update(p_id uuid,p_expected_version integer)
returns public.contributions language plpgsql security definer set search_path='' as $$
declare c public.contributions;
begin
 select * into c from public.contributions where id=p_id for update;
 if not found or auth.uid() is null then raise exception 'Publication forbidden' using errcode='42501'; end if;
 perform 1 from private.verified_place_management where contribution_id=p_id for share;
 if not private.can_publish_place_update(p_id) then
  raise exception 'Cette mise à jour nécessite une validation ou une gestion vérifiée.' using errcode='42501';
 end if;
 if c.version is distinct from p_expected_version then raise exception 'Stale contribution version' using errcode='40001'; end if;
 update public.places set description=c.description,details=c.details,published_at=now() where id=c.id;
 -- Existing photo trigger copies the current photo associations atomically.
 update public.contributions set status='published',version=version+1,updated_at=now(),
  reviewed_by=null,reviewed_at=null,review_note='' where id=c.id returning * into c;
 insert into private.contribution_audit(contribution_id,actor_id,action,version)
  values(c.id,auth.uid(),'professional_update_published',c.version);
 return c;
end;
$$;
create function public.publish_place_update(p_id uuid,p_expected_version integer)
returns public.contributions language sql security invoker set search_path='' as $$
 select * from private.publish_place_update(p_id,p_expected_version);
$$;
revoke all on function private.can_publish_place_update(uuid),public.can_publish_place_update(uuid),
 private.publish_place_update(uuid,integer),public.publish_place_update(uuid,integer) from public,anon;
grant execute on function private.can_publish_place_update(uuid),public.can_publish_place_update(uuid),
 private.publish_place_update(uuid,integer),public.publish_place_update(uuid,integer) to authenticated;
