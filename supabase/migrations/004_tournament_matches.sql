-- Squad Planner Phase 5: tournaments, fixtures, match squads and results.
-- Apply manually after 003_live_auction.sql.
create table public.tournaments (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
 name text not null check(char_length(trim(name))>0), start_date date not null, end_date date,
 location text, notes text, maximum_match_squad_size integer not null default 15 check(maximum_match_squad_size>0),
 default_match_squad_size integer not null default 11 check(default_match_squad_size>0), is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint tournaments_dates_check check(end_date is null or end_date>=start_date),
 constraint tournaments_squad_sizes_check check(default_match_squad_size<=maximum_match_squad_size),
 constraint tournaments_team_id_id_key unique(team_id,id)
);
create unique index tournaments_one_active_team_idx on public.tournaments(team_id) where is_active;
create table public.matches (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null, team_id uuid not null references public.teams(id) on delete cascade,
 opponent_name text not null check(char_length(trim(opponent_name))>0), match_date date not null, match_time time,
 venue text, round_name text, match_number integer check(match_number is null or match_number>0), squad_size integer check(squad_size is null or squad_size>0),
 result text not null default 'scheduled' check(result in('scheduled','won','lost','draw','no_result','cancelled')),
 team_score text, opponent_score text, result_notes text, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint matches_tournament_same_team_fkey foreign key(team_id,tournament_id) references public.tournaments(team_id,id) on delete cascade,
 constraint matches_team_id_id_key unique(team_id,id)
);
create table public.match_players (
 id uuid primary key default gen_random_uuid(), match_id uuid not null, player_id uuid not null, team_id uuid not null references public.teams(id) on delete cascade,
 selected boolean not null default true, playing_status text not null default 'selected' check(playing_status in('selected','playing','substitute','unavailable','not_selected')),
 availability_override text not null default 'unknown' check(availability_override in('available','unavailable','unknown')),
 batting_order integer check(batting_order is null or batting_order>0), bowling_order integer check(bowling_order is null or bowling_order>0),
 is_match_captain boolean not null default false, is_wicketkeeper boolean not null default false, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint match_players_match_same_team_fkey foreign key(team_id,match_id) references public.matches(team_id,id) on delete cascade,
 constraint match_players_player_same_team_fkey foreign key(team_id,player_id) references public.players(team_id,id) on delete restrict,
 constraint match_players_match_player_key unique(match_id,player_id)
);
create unique index match_players_one_captain_idx on public.match_players(match_id) where is_match_captain;
create index tournaments_team_idx on public.tournaments(team_id,start_date desc);create index matches_team_date_idx on public.matches(team_id,match_date,match_time);create index matches_tournament_idx on public.matches(tournament_id);create index match_players_match_idx on public.match_players(match_id,playing_status);create index match_players_player_idx on public.match_players(player_id);
create trigger tournaments_set_updated_at before update on public.tournaments for each row execute function private.set_updated_at();
create trigger matches_set_updated_at before update on public.matches for each row execute function private.set_updated_at();
create trigger match_players_set_updated_at before update on public.match_players for each row execute function private.set_updated_at();
create or replace function private.validate_match_player_squad() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.players where id=new.player_id and team_id=new.team_id and auction_status='my_team') then raise exception 'PLAYER_NOT_IN_TEAM_SQUAD'; end if;
 return new;
end;$$;
create trigger match_players_validate_squad before insert or update of player_id,team_id on public.match_players for each row execute function private.validate_match_player_squad();
revoke all on function private.validate_match_player_squad() from public;
alter table public.tournaments enable row level security;alter table public.matches enable row level security;alter table public.match_players enable row level security;
create policy "Members read tournaments" on public.tournaments for select to authenticated using((select private.is_team_member(team_id)));
create policy "Managers create tournaments" on public.tournaments for insert to authenticated with check((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Managers update tournaments" on public.tournaments for update to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[]))) with check((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Managers delete tournaments" on public.tournaments for delete to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Members read matches" on public.matches for select to authenticated using((select private.is_team_member(team_id)));
create policy "Managers create matches" on public.matches for insert to authenticated with check((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Managers update matches" on public.matches for update to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[]))) with check((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Managers delete matches" on public.matches for delete to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Members read match players" on public.match_players for select to authenticated using((select private.is_team_member(team_id)));
create policy "Managers create match players" on public.match_players for insert to authenticated with check((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Managers update match players" on public.match_players for update to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[]))) with check((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Managers delete match players" on public.match_players for delete to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
grant select,insert,update,delete on public.tournaments,public.matches,public.match_players to authenticated;
create or replace function public.phase5_setup_status() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object('tournaments',to_regclass('public.tournaments') is not null,'matches',to_regclass('public.matches') is not null,'match_players',to_regclass('public.match_players') is not null,'captain_unique',exists(select 1 from pg_indexes where schemaname='public' and indexname='match_players_one_captain_idx'),'squad_trigger',to_regprocedure('private.validate_match_player_squad()') is not null);$$;
revoke all on function public.phase5_setup_status() from public;grant execute on function public.phase5_setup_status() to anon,authenticated;
