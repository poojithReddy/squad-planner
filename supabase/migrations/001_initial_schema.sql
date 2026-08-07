-- Squad Planner initial hosted Supabase schema.
-- Run once in Supabase Dashboard > SQL Editor against the intended new project.

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  primary_colour text,
  secondary_colour text,
  captain_name text not null check (char_length(trim(captain_name)) > 0),
  vice_captain_name text,
  manager_name text,
  squad_size integer not null check (squad_size > 0),
  total_auction_budget numeric(12, 2) not null default 0 check (total_auction_budget >= 0),
  logo_url text,
  banner_url text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'captain', 'vice_captain', 'manager', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_members_team_user_key unique (team_id, user_id)
);

create index team_members_user_id_idx on public.team_members(user_id);
create index team_members_team_id_idx on public.team_members(team_id);
create index teams_created_by_idx on public.teams(created_by);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function private.set_updated_at();

create trigger team_members_set_updated_at
before update on public.team_members
for each row execute function private.set_updated_at();

create or replace function private.prevent_team_creator_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'The team creator cannot be changed';
  end if;
  return new;
end;
$$;

create trigger teams_prevent_creator_change
before update of created_by on public.teams
for each row execute function private.prevent_team_creator_change();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Backfill profiles safely if Auth users existed before this migration.
insert into public.profiles (id, full_name)
select id, raw_user_meta_data ->> 'full_name'
from auth.users
on conflict (id) do nothing;

-- SECURITY DEFINER prevents team_members RLS from recursively evaluating itself.
-- These helpers expose only boolean membership decisions and use an empty search path.
create or replace function private.is_team_member(requested_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = requested_team_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.has_team_role(requested_team_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = requested_team_id
      and user_id = (select auth.uid())
      and role = any(allowed_roles)
  );
$$;

-- Safely extracts the team UUID from teams/{teamId}/{assetType}/{filename}.
create or replace function private.team_id_from_storage_path(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(object_name, '/', 2)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- Atomic team creation. The caller cannot choose created_by; it always uses auth.uid().
-- SECURITY DEFINER is required so the team and its first membership can be inserted
-- in the same transaction before membership-based RLS can authorize the new team.
create or replace function public.create_team(
  p_name text,
  p_primary_colour text,
  p_captain_name text,
  p_vice_captain_name text,
  p_manager_name text,
  p_squad_size integer,
  p_total_auction_budget numeric,
  p_secondary_colour text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_team_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.teams (
    name,
    primary_colour,
    secondary_colour,
    captain_name,
    vice_captain_name,
    manager_name,
    squad_size,
    total_auction_budget,
    created_by
  ) values (
    nullif(trim(p_name), ''),
    nullif(trim(p_primary_colour), ''),
    nullif(trim(p_secondary_colour), ''),
    nullif(trim(p_captain_name), ''),
    nullif(trim(p_vice_captain_name), ''),
    nullif(trim(p_manager_name), ''),
    p_squad_size,
    p_total_auction_budget,
    current_user_id
  )
  returning id into new_team_id;

  insert into public.team_members (team_id, user_id, role)
  values (new_team_id, current_user_id, 'owner');

  return new_team_id;
end;
$$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.has_team_role(uuid, text[]) to authenticated;
grant execute on function private.team_id_from_storage_path(text) to authenticated;

revoke all on function public.create_team(text, text, text, text, text, integer, numeric, text) from public;
grant execute on function public.create_team(text, text, text, text, text, integer, numeric, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Members can read authorised teams"
on public.teams for select to authenticated
using ((select private.is_team_member(id)));

create policy "Owners and captains can update teams"
on public.teams for update to authenticated
using ((select private.has_team_role(id, array['owner', 'captain']::text[])))
with check ((select private.has_team_role(id, array['owner', 'captain']::text[])));

create policy "Members can read authorised membership"
on public.team_members for select to authenticated
using ((select private.is_team_member(team_id)));

grant select, update on public.profiles to authenticated;
grant select, update on public.teams to authenticated;
grant select on public.team_members to authenticated;

-- A private bucket enforces the common 5 MB ceiling and allowed MIME types.
-- The app separately enforces the stricter 2 MB logo limit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-assets',
  'team-assets',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Members can view team assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'team-assets'
  and split_part(name, '/', 1) = 'teams'
  and (select private.is_team_member(private.team_id_from_storage_path(name)))
);

create policy "Owners and captains can upload team assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'team-assets'
  and split_part(name, '/', 1) = 'teams'
  and split_part(name, '/', 3) in ('logo', 'banner')
  and (select private.has_team_role(private.team_id_from_storage_path(name), array['owner', 'captain']::text[]))
);

create policy "Owners and captains can update team assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'team-assets'
  and (select private.has_team_role(private.team_id_from_storage_path(name), array['owner', 'captain']::text[]))
)
with check (
  bucket_id = 'team-assets'
  and split_part(name, '/', 1) = 'teams'
  and split_part(name, '/', 3) in ('logo', 'banner')
  and (select private.has_team_role(private.team_id_from_storage_path(name), array['owner', 'captain']::text[]))
);

create policy "Owners and captains can delete team assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'team-assets'
  and (select private.has_team_role(private.team_id_from_storage_path(name), array['owner', 'captain']::text[]))
);

-- Non-sensitive boolean metadata used only by the development verification page.
create or replace function public.app_setup_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'profiles_rls', coalesce((select relrowsecurity from pg_catalog.pg_class where oid = 'public.profiles'::regclass), false),
    'teams_rls', coalesce((select relrowsecurity from pg_catalog.pg_class where oid = 'public.teams'::regclass), false),
    'team_members_rls', coalesce((select relrowsecurity from pg_catalog.pg_class where oid = 'public.team_members'::regclass), false),
    'foreign_keys', (select count(*) >= 4 from pg_catalog.pg_constraint where contype = 'f' and conrelid in ('public.profiles'::regclass, 'public.teams'::regclass, 'public.team_members'::regclass)),
    'unique_membership', exists (select 1 from pg_catalog.pg_constraint where conname = 'team_members_team_user_key' and conrelid = 'public.team_members'::regclass),
    'check_constraints', (select count(*) >= 4 from pg_catalog.pg_constraint where contype = 'c' and conrelid in ('public.teams'::regclass, 'public.team_members'::regclass)),
    'create_team_function', to_regprocedure('public.create_team(text,text,text,text,text,integer,numeric,text)') is not null,
    'team_assets_bucket', exists (select 1 from storage.buckets where id = 'team-assets' and public = false)
  );
$$;

revoke all on function public.app_setup_status() from public;
grant execute on function public.app_setup_status() to anon, authenticated;
