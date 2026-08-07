-- Squad Planner Phase 8: bucket-scoped player imports and imported summary statistics.
-- Apply manually after 006_profile_production.sql. Do not use Supabase CLI db push.

alter table public.players
  add column if not exists matches integer not null default 0,
  add column if not exists batting_score integer not null default 0,
  add column if not exists bowling_wickets integer not null default 0,
  add column if not exists catches integer not null default 0;

alter table public.players
  add constraint players_matches_nonnegative check (matches >= 0),
  add constraint players_batting_score_nonnegative check (batting_score >= 0),
  add constraint players_bowling_wickets_nonnegative check (bowling_wickets >= 0),
  add constraint players_catches_nonnegative check (catches >= 0);

create table public.player_import_history (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  bucket_id uuid not null,
  imported_by uuid not null references auth.users(id) on delete restrict,
  filename text not null check (char_length(filename) between 1 and 255),
  total_rows integer not null check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  updated_rows integer not null default 0 check (updated_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  created_at timestamptz not null default now(),
  constraint player_import_history_bucket_fkey
    foreign key (team_id, bucket_id)
    references public.auction_buckets(team_id, id)
    on delete cascade
);

create index player_import_history_team_created_idx
  on public.player_import_history(team_id, created_at desc);

alter table public.player_import_history enable row level security;

create policy "Members can read player import history"
on public.player_import_history for select to authenticated
using ((select private.is_team_member(team_id)));

create policy "Planning managers can create player import history"
on public.player_import_history for insert to authenticated
with check (
  imported_by = (select auth.uid())
  and (select private.has_team_role(team_id, array['owner','captain','vice_captain','manager']::text[]))
);

grant select, insert on public.player_import_history to authenticated;

create or replace function public.phase8_setup_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'player_statistics', (
      select count(*) = 4 from information_schema.columns
      where table_schema = 'public' and table_name = 'players'
        and column_name in ('matches','batting_score','bowling_wickets','catches')
    ),
    'import_history', to_regclass('public.player_import_history') is not null,
    'history_rls', coalesce((select relrowsecurity from pg_catalog.pg_class where oid = to_regclass('public.player_import_history')), false),
    'statistics_constraints', (
      select count(*) = 4 from pg_catalog.pg_constraint
      where conname in ('players_matches_nonnegative','players_batting_score_nonnegative','players_bowling_wickets_nonnegative','players_catches_nonnegative')
    )
  );
$$;

revoke all on function public.phase8_setup_status() from public;
grant execute on function public.phase8_setup_status() to anon, authenticated;
