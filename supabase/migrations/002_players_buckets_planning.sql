-- Squad Planner Phase 3: team-private player pool, buckets and probable plans.
-- Apply manually after 001_initial_schema.sql in Supabase Dashboard > SQL Editor.

create table public.auction_buckets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  minimum_players integer not null default 0 check (minimum_players >= 0),
  maximum_players integer,
  planned_budget numeric(12, 2) not null default 0 check (planned_budget >= 0),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auction_buckets_maximum_check
    check (maximum_players is null or maximum_players >= minimum_players),
  constraint auction_buckets_team_id_id_key unique (team_id, id)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  bucket_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 120),
  role text,
  priority integer check (priority between 1 and 5),
  expected_price numeric(12, 2) not null default 0 check (expected_price >= 0),
  availability_status text not null default 'unknown'
    check (availability_status in ('full', 'partial', 'unknown')),
  available_matches integer check (available_matches is null or available_matches >= 0),
  availability_notes text,
  notes text,
  auction_status text not null default 'available'
    check (auction_status in ('available', 'my_team', 'other_team')),
  sold_price numeric(12, 2) not null default 0 check (sold_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_team_id_id_key unique (team_id, id),
  constraint players_bucket_same_team_fkey
    foreign key (team_id, bucket_id)
    references public.auction_buckets(team_id, id)
    on delete set null (bucket_id)
);

create table public.probable_teams (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  plan_label text not null check (plan_label in ('A', 'B', 'C')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint probable_teams_team_plan_key unique (team_id, plan_label),
  constraint probable_teams_team_id_id_key unique (team_id, id)
);

create table public.probable_team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  probable_team_id uuid not null,
  player_id uuid not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint probable_team_players_plan_fkey
    foreign key (team_id, probable_team_id)
    references public.probable_teams(team_id, id)
    on delete cascade,
  constraint probable_team_players_player_fkey
    foreign key (team_id, player_id)
    references public.players(team_id, id)
    on delete cascade,
  constraint probable_team_players_plan_player_key unique (probable_team_id, player_id)
);

create index auction_buckets_team_order_idx on public.auction_buckets(team_id, display_order);
create index players_team_name_idx on public.players(team_id, name);
create index players_team_bucket_idx on public.players(team_id, bucket_id);
create index players_team_status_idx on public.players(team_id, auction_status);
create index probable_teams_team_idx on public.probable_teams(team_id);
create index probable_team_players_plan_order_idx on public.probable_team_players(probable_team_id, display_order);

create trigger auction_buckets_set_updated_at
before update on public.auction_buckets
for each row execute function private.set_updated_at();

create trigger players_set_updated_at
before update on public.players
for each row execute function private.set_updated_at();

create trigger probable_teams_set_updated_at
before update on public.probable_teams
for each row execute function private.set_updated_at();

create trigger probable_team_players_set_updated_at
before update on public.probable_team_players
for each row execute function private.set_updated_at();

-- Every team always has one row for each optional planning scenario.
create or replace function private.create_default_probable_teams()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.probable_teams (team_id, plan_label)
  values (new.id, 'A'), (new.id, 'B'), (new.id, 'C')
  on conflict (team_id, plan_label) do nothing;
  return new;
end;
$$;

create trigger teams_create_default_probable_teams
after insert on public.teams
for each row execute function private.create_default_probable_teams();

revoke all on function private.create_default_probable_teams() from public;

insert into public.probable_teams (team_id, plan_label)
select t.id, labels.plan_label
from public.teams t
cross join (values ('A'), ('B'), ('C')) as labels(plan_label)
on conflict (team_id, plan_label) do nothing;

alter table public.auction_buckets enable row level security;
alter table public.players enable row level security;
alter table public.probable_teams enable row level security;
alter table public.probable_team_players enable row level security;

create policy "Members can read auction buckets"
on public.auction_buckets for select to authenticated
using ((select private.is_team_member(team_id)));

create policy "Planning managers can create auction buckets"
on public.auction_buckets for insert to authenticated
with check ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Planning managers can update auction buckets"
on public.auction_buckets for update to authenticated
using ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])))
with check ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Planning managers can delete auction buckets"
on public.auction_buckets for delete to authenticated
using ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Members can read players"
on public.players for select to authenticated
using ((select private.is_team_member(team_id)));

create policy "Planning managers can create players"
on public.players for insert to authenticated
with check ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Planning managers can update players"
on public.players for update to authenticated
using ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])))
with check ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Planning managers can delete players"
on public.players for delete to authenticated
using ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Members can read probable plans"
on public.probable_teams for select to authenticated
using ((select private.is_team_member(team_id)));

create policy "Planning managers can create probable plans"
on public.probable_teams for insert to authenticated
with check ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Planning managers can update probable plans"
on public.probable_teams for update to authenticated
using ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])))
with check ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Members can read probable selections"
on public.probable_team_players for select to authenticated
using ((select private.is_team_member(team_id)));

create policy "Planning managers can create probable selections"
on public.probable_team_players for insert to authenticated
with check ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Planning managers can update probable selections"
on public.probable_team_players for update to authenticated
using ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])))
with check ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

create policy "Planning managers can delete probable selections"
on public.probable_team_players for delete to authenticated
using ((select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[])));

grant select, insert, update, delete on public.auction_buckets to authenticated;
grant select, insert, update, delete on public.players to authenticated;
grant select, insert, update on public.probable_teams to authenticated;
grant select, insert, update, delete on public.probable_team_players to authenticated;

-- Safe, non-sensitive readiness metadata for the development check page.
create or replace function public.phase3_setup_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'auction_buckets', to_regclass('public.auction_buckets') is not null,
    'players', to_regclass('public.players') is not null,
    'probable_teams', to_regclass('public.probable_teams') is not null,
    'probable_team_players', to_regclass('public.probable_team_players') is not null,
    'rls', (
      select count(*) = 4
      from pg_catalog.pg_class
      where oid in (
        'public.auction_buckets'::regclass,
        'public.players'::regclass,
        'public.probable_teams'::regclass,
        'public.probable_team_players'::regclass
      ) and relrowsecurity
    ),
    'cross_team_constraints', (
      select count(*) >= 3
      from pg_catalog.pg_constraint
      where conname in (
        'players_bucket_same_team_fkey',
        'probable_team_players_plan_fkey',
        'probable_team_players_player_fkey'
      )
    )
  );
$$;

revoke all on function public.phase3_setup_status() from public;
grant execute on function public.phase3_setup_status() to anon, authenticated;
