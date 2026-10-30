create table public.reservation_settings (
 place_id uuid primary key references public.contributions(id) on delete cascade,
 entitled boolean not null default false,
 enabled boolean not null default false,
 tables boolean not null default true,
 stays boolean not null default false,
 check (tables or stays)
);
create function private.manages_reservations(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.contributions c
 join private.verified_place_management v on v.contribution_id=c.id and v.organization_id=c.organization_id
 where c.id=p_id and private.can_edit_contribution(c.author_id,c.organization_id));
$$;
create function private.reservations_open(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.reservation_settings s join public.places p on p.id=s.place_id
 join public.contributions c on c.id=p.id
 join private.verified_place_management v on v.contribution_id=c.id and v.organization_id=c.organization_id
 where s.place_id=p_id and s.entitled and s.enabled);
$$;
revoke all on function private.manages_reservations(uuid),private.reservations_open(uuid) from public;
grant execute on function private.manages_reservations(uuid),private.reservations_open(uuid) to anon,authenticated;
alter table public.reservation_settings enable row level security;
revoke all on public.reservation_settings from public,anon,authenticated;
grant select on public.reservation_settings to anon,authenticated;
create policy reservation_settings_read on public.reservation_settings for select to anon,authenticated
 using(private.reservations_open(place_id) or private.manages_reservations(place_id));

create table public.reservation_requests (
 id uuid primary key default gen_random_uuid(),
 place_id uuid not null references public.contributions(id),
 requester_id uuid not null references auth.users(id),
 kind text not null check(kind in ('table','stay')),
 starts_at timestamptz not null,
 ends_at timestamptz,
 guests integer not null check(guests between 1 and 30),
 contact_name text not null check(length(trim(contact_name)) between 2 and 100),
 contact_phone text not null check(length(trim(contact_phone)) between 6 and 40),
 message text not null default '' check(length(message)<=1000),
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 response text not null default '' check(length(response)<=1000),
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((kind='table' and ends_at is null) or (kind='stay' and ends_at is not null and ends_at>starts_at and ends_at<=starts_at+interval '90 days'))
);
create index reservation_requester_idx on public.reservation_requests(requester_id,created_at);
create index reservation_place_idx on public.reservation_requests(place_id,starts_at);
alter table public.reservation_requests enable row level security;
revoke all on public.reservation_requests from public,anon,authenticated;
grant select on public.reservation_requests to authenticated;
create policy reservations_private on public.reservation_requests for select to authenticated
 using(requester_id=(select auth.uid()) or private.manages_reservations(place_id));

create function private.configure_reservations(p_id uuid,p_enabled boolean,p_tables boolean,p_stays boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.manages_reservations(p_id) then raise exception 'Gestion non autorisée' using errcode='42501'; end if;
 update public.reservation_settings set enabled=p_enabled,tables=p_tables,stays=p_stays where place_id=p_id and entitled;
 if not found then raise exception 'Extension non incluse dans votre formule' using errcode='42501'; end if;
end; $$;
create function private.request_reservation(p_place uuid,p_kind text,p_start timestamptz,p_end timestamptz,p_guests integer,p_name text,p_phone text,p_message text)
returns public.reservation_requests language plpgsql security definer set search_path='' as $$
declare r public.reservation_requests;
begin
 if auth.uid() is null then raise exception 'Connexion requise' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if not private.reservations_open(p_place) or not exists(select 1 from public.reservation_settings where place_id=p_place and ((p_kind='table' and tables) or (p_kind='stay' and stays))) then
 raise exception 'Réservations indisponibles' using errcode='42501'; end if;
 if p_start<=now() or p_start>now()+interval '2 years' then raise exception 'Choisissez une date future dans les deux ans' using errcode='22023'; end if;
 if (select count(*) from public.reservation_requests where requester_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Limite de dix demandes par jour atteinte' using errcode='22023'; end if;
 if exists(select 1 from public.reservation_requests where requester_id=auth.uid() and place_id=p_place and starts_at=p_start and kind=p_kind and status in ('pending','accepted')) then raise exception 'Cette demande existe déjà' using errcode='22023'; end if;
 insert into public.reservation_requests(place_id,requester_id,kind,starts_at,ends_at,guests,contact_name,contact_phone,message)
 values(p_place,auth.uid(),p_kind,p_start,p_end,p_guests,trim(p_name),trim(p_phone),trim(p_message)) returning * into r;
 return r;
end; $$;
create function private.respond_reservation(p_id uuid,p_version integer,p_status text,p_response text)
returns void language plpgsql security definer set search_path='' as $$
declare r public.reservation_requests;
begin
 select * into r from public.reservation_requests where id=p_id for update;
 if not found or auth.uid() is null then raise exception 'Demande inaccessible' using errcode='42501'; end if;
 if r.version is distinct from p_version then raise exception 'Demande modifiée : actualisez' using errcode='40001'; end if;
 if p_status='accepted' and r.starts_at<=now() then raise exception 'Cette date est déjà passée' using errcode='22023'; end if;
 if not ((p_status='cancelled' and r.requester_id=auth.uid() and r.status in ('pending','accepted')) or
 (p_status in ('accepted','declined') and private.manages_reservations(r.place_id) and r.status='pending')) then
 raise exception 'Réponse non autorisée' using errcode='42501'; end if;
 update public.reservation_requests set status=p_status,response=case when p_status='cancelled' then response else trim(p_response) end,version=version+1,updated_at=now() where id=p_id;
end; $$;

create function public.configure_reservations(p_id uuid,p_enabled boolean,p_tables boolean,p_stays boolean)
returns void language sql security invoker set search_path='' as $$select private.configure_reservations(p_id,p_enabled,p_tables,p_stays);$$;
create function public.manages_reservations(p_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$select private.manages_reservations(p_id);$$;
revoke all on function public.manages_reservations(uuid) from public,anon;
grant execute on function public.manages_reservations(uuid) to authenticated;
create function public.request_reservation(p_place uuid,p_kind text,p_start timestamptz,p_end timestamptz,p_guests integer,p_name text,p_phone text,p_message text)
returns public.reservation_requests language sql security invoker set search_path='' as $$select * from private.request_reservation(p_place,p_kind,p_start,p_end,p_guests,p_name,p_phone,p_message);$$;
create function public.respond_reservation(p_id uuid,p_version integer,p_status text,p_response text)
returns void language sql security invoker set search_path='' as $$select private.respond_reservation(p_id,p_version,p_status,p_response);$$;
revoke all on function private.configure_reservations(uuid,boolean,boolean,boolean),public.configure_reservations(uuid,boolean,boolean,boolean),
 private.request_reservation(uuid,text,timestamptz,timestamptz,integer,text,text,text),public.request_reservation(uuid,text,timestamptz,timestamptz,integer,text,text,text),
 private.respond_reservation(uuid,integer,text,text),public.respond_reservation(uuid,integer,text,text) from public,anon;
grant execute on function private.configure_reservations(uuid,boolean,boolean,boolean),public.configure_reservations(uuid,boolean,boolean,boolean),
 private.request_reservation(uuid,text,timestamptz,timestamptz,integer,text,text,text),public.request_reservation(uuid,text,timestamptz,timestamptz,integer,text,text,text),
 private.respond_reservation(uuid,integer,text,text),public.respond_reservation(uuid,integer,text,text) to authenticated;
