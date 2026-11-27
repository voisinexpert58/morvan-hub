-- Morvan Hub : noyau multi-organisation et catalogue d'extensions.
-- Migration PREPARÉE mais non appliquée sur une base réelle.
-- Hypothèse : Supabase Auth (auth.users), PostgreSQL >= 15.
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.organizations (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
 name text not null check (length(trim(name)) > 0),
 created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','admin','editor','viewer')),
 joined_at timestamptz not null default now(),
 primary key (organization_id, user_id)
);
create index if not exists organization_members_user_idx on public.organization_members(user_id);

create table if not exists public.module_catalog (
 id text primary key check (id ~ '^morvan\.[a-z][a-z0-9-]*$'),
 name text not null,
 version text not null,
 core_api_version text not null,
 remote_name text not null unique,
 remote_entry text not null,
 remote_expose text not null default './App',
 permissions text[] not null default '{}',
 status text not null default 'draft' check (status in ('draft','published','disabled')),
 created_at timestamptz not null default now()
);

create table if not exists public.organization_modules (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 module_id text not null references public.module_catalog(id),
 enabled boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(organization_id,module_id)
);

create table if not exists public.module_audit (
 id bigint generated always as identity primary key,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 actor_user_id uuid not null references auth.users(id),
 module_id text not null references public.module_catalog(id),
 action text not null check (action in ('enabled','disabled')),
 created_at timestamptz not null default now()
);
create index if not exists module_audit_org_idx on public.module_audit(organization_id, created_at desc);

-- Fonctions SECURITY DEFINER pour éviter toute récursion des politiques RLS.
-- Attention : search_path vide + références qualifiées.
create or replace function private.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(
  select 1 from public.organization_members m
  where m.organization_id = p_org and m.user_id = (select auth.uid())
 );
$$;
create or replace function private.is_org_manager(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(
  select 1 from public.organization_members m
  where m.organization_id = p_org and m.user_id = (select auth.uid())
    and m.role in ('owner','admin')
 );
$$;
revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.is_org_manager(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_manager(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.module_catalog enable row level security;
alter table public.organization_modules enable row level security;
alter table public.module_audit enable row level security;

-- Privilèges explicites (RLS ne remplace pas GRANT/REVOKE).
revoke all on table public.organizations, public.organization_members, public.module_catalog, public.organization_modules, public.module_audit from anon, authenticated;
grant select on public.organizations, public.organization_members, public.module_catalog, public.organization_modules to authenticated;
grant insert, update, delete on public.organization_modules to authenticated;
-- Les créations d'organisation, memberships et modules du catalogue passent par un processus serveur approuvé.
-- L'historique d'audit est écrit par un trigger plutôt que par les navigateurs.

create policy organizations_member_select on public.organizations for select to authenticated
 using ((select private.is_org_member(id)));
create policy organization_members_self_select on public.organization_members for select to authenticated
 using (user_id = (select auth.uid()));
create policy module_catalog_published_select on public.module_catalog for select to authenticated
 using (status = 'published');
create policy organization_modules_member_select on public.organization_modules for select to authenticated
 using ((select private.is_org_member(organization_id)));
create policy organization_modules_manager_insert on public.organization_modules for insert to authenticated
 with check ((select private.is_org_manager(organization_id)) and exists (
  select 1 from public.module_catalog c where c.id = module_id and c.status = 'published'
 ));
create policy organization_modules_manager_update on public.organization_modules for update to authenticated
 using ((select private.is_org_manager(organization_id)))
 with check ((select private.is_org_manager(organization_id)) and exists (
  select 1 from public.module_catalog c where c.id = module_id and c.status = 'published'
 ));
create policy organization_modules_manager_delete on public.organization_modules for delete to authenticated
 using ((select private.is_org_manager(organization_id)));

-- Journalisation des bascules d'activation. Le trigger s'exécute en tant que son propriétaire.
create or replace function private.audit_module_toggle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if (tg_op = 'INSERT' and new.enabled) or (tg_op = 'UPDATE' and old.enabled is distinct from new.enabled) then
   insert into public.module_audit(organization_id, actor_user_id, module_id, action)
   values(new.organization_id, auth.uid(), new.module_id,
     case when new.enabled then 'enabled' else 'disabled' end);
 end if;
 return new;
end;
$$;
create trigger audit_org_module_change
 after insert or update of enabled on public.organization_modules
 for each row execute function private.audit_module_toggle();
-- À compléter avant la production : tests pgTAP allow/deny, règles de facturation,
-- révocation d'abonnement côté serveur et contrôle des actions métiers.

