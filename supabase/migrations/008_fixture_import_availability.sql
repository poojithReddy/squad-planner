-- Squad Planner Phase 13: fixture import audit and public tournament availability.
-- Apply manually after 007_bucket_player_stats_import.sql.

create table public.tournament_availability_links (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  tournament_id uuid not null,
  token_hash text not null unique check (char_length(token_hash) = 64),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_link_tournament_team_fkey foreign key (team_id, tournament_id)
    references public.tournaments(team_id, id) on delete cascade
);

create unique index availability_one_active_link_idx
  on public.tournament_availability_links(team_id, tournament_id) where is_active;

create table public.match_availability (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  tournament_id uuid not null,
  match_id uuid not null,
  player_id uuid not null,
  availability_status text not null check (availability_status in ('available','unavailable','maybe')),
  notes text check (notes is null or char_length(notes) <= 500),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_availability_tournament_team_fkey foreign key (team_id, tournament_id)
    references public.tournaments(team_id, id) on delete cascade,
  constraint match_availability_match_team_fkey foreign key (team_id, match_id)
    references public.matches(team_id, id) on delete cascade,
  constraint match_availability_player_team_fkey foreign key (team_id, player_id)
    references public.players(team_id, id) on delete cascade,
  constraint match_availability_match_player_key unique(match_id,player_id)
);

create table public.fixture_import_history (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  tournament_id uuid not null, imported_by uuid not null references auth.users(id) on delete restrict,
  filename text not null, total_rows integer not null default 0, imported_rows integer not null default 0,
  updated_rows integer not null default 0, skipped_rows integer not null default 0, failed_rows integer not null default 0,
  created_at timestamptz not null default now(),
  constraint fixture_import_tournament_team_fkey foreign key(team_id,tournament_id) references public.tournaments(team_id,id) on delete cascade
);

create index match_availability_match_idx on public.match_availability(match_id, availability_status);
create index match_availability_player_idx on public.match_availability(player_id, updated_at desc);
create index availability_links_team_idx on public.tournament_availability_links(team_id, tournament_id);

create trigger availability_links_set_updated_at before update on public.tournament_availability_links
  for each row execute function private.set_updated_at();
create trigger match_availability_set_updated_at before update on public.match_availability
  for each row execute function private.set_updated_at();

alter table public.tournament_availability_links enable row level security;
alter table public.match_availability enable row level security;
alter table public.fixture_import_history enable row level security;

create policy "Members read availability links" on public.tournament_availability_links for select to authenticated
  using ((select private.is_team_member(team_id)));
create policy "Managers create availability links" on public.tournament_availability_links for insert to authenticated
  with check (created_by = (select auth.uid()) and (select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Managers update availability links" on public.tournament_availability_links for update to authenticated
  using ((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])))
  with check ((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Members read availability" on public.match_availability for select to authenticated
  using ((select private.is_team_member(team_id)));
create policy "Managers manage availability" on public.match_availability for all to authenticated
  using ((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])))
  with check ((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Members read fixture imports" on public.fixture_import_history for select to authenticated
  using ((select private.is_team_member(team_id)));
create policy "Managers create fixture imports" on public.fixture_import_history for insert to authenticated
  with check (imported_by=(select auth.uid()) and (select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));

grant select,insert,update on public.tournament_availability_links to authenticated;
grant select,insert,update,delete on public.match_availability to authenticated;
grant select,insert on public.fixture_import_history to authenticated;

create or replace function public.get_public_availability_form(p_token text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_link public.tournament_availability_links; v_result jsonb;
begin
  select * into v_link from public.tournament_availability_links
  where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and is_active
    and (expires_at is null or expires_at > now());
  if v_link.id is null then return null; end if;
  select jsonb_build_object(
    'team', jsonb_build_object('name',te.name),
    'tournament',jsonb_build_object('name',t.name,'start_date',t.start_date,'end_date',t.end_date,'location',t.location),
    'players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'role',p.role) order by p.name),'[]'::jsonb) from public.players p where p.team_id=v_link.team_id and p.auction_status='my_team'),
    'fixtures',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'match_number',m.match_number,'opponent_name',m.opponent_name,'match_date',m.match_date,'match_time',m.match_time,'venue',m.venue,'round_name',m.round_name) order by m.match_date,m.match_time),'[]'::jsonb) from public.matches m where m.team_id=v_link.team_id and m.tournament_id=v_link.tournament_id and m.result='scheduled' and m.match_date>=current_date)
  ) into v_result from public.teams te join public.tournaments t on t.id=v_link.tournament_id and t.team_id=te.id where te.id=v_link.team_id;
  return v_result;
end;$$;

create or replace function public.get_public_player_availability(p_token text, p_player_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_link public.tournament_availability_links;
begin
  select * into v_link from public.tournament_availability_links where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and is_active and (expires_at is null or expires_at>now());
  if v_link.id is null or not exists(select 1 from public.players where id=p_player_id and team_id=v_link.team_id and auction_status='my_team') then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('match_id',match_id,'availability_status',availability_status,'notes',notes)),'[]'::jsonb) from public.match_availability where team_id=v_link.team_id and tournament_id=v_link.tournament_id and player_id=p_player_id);
end;$$;

create or replace function public.submit_player_availability(p_token text, p_player_id uuid, p_responses jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare v_link public.tournament_availability_links; v_response jsonb; v_count integer:=0; v_match uuid; v_status text; v_notes text;
begin
  select * into v_link from public.tournament_availability_links where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and is_active and (expires_at is null or expires_at>now()) for update;
  if v_link.id is null then raise exception 'AVAILABILITY_LINK_INVALID'; end if;
  if not exists(select 1 from public.players where id=p_player_id and team_id=v_link.team_id and auction_status='my_team') then raise exception 'PLAYER_NOT_IN_SQUAD'; end if;
  for v_response in select * from jsonb_array_elements(p_responses) loop
    v_match:=(v_response->>'match_id')::uuid; v_status:=v_response->>'availability_status'; v_notes:=nullif(trim(v_response->>'notes'),'');
    if v_status not in ('available','unavailable','maybe') then raise exception 'INVALID_AVAILABILITY_STATUS'; end if;
    if not exists(select 1 from public.matches where id=v_match and team_id=v_link.team_id and tournament_id=v_link.tournament_id) then raise exception 'MATCH_NOT_IN_TOURNAMENT'; end if;
    insert into public.match_availability(team_id,tournament_id,match_id,player_id,availability_status,notes,submitted_at)
    values(v_link.team_id,v_link.tournament_id,v_match,p_player_id,v_status,left(v_notes,500),now())
    on conflict(match_id,player_id) do update set availability_status=excluded.availability_status,notes=excluded.notes,submitted_at=now(),updated_at=now();
    v_count:=v_count+1;
  end loop;
  return v_count;
end;$$;

revoke all on function public.get_public_availability_form(text) from public;
revoke all on function public.get_public_player_availability(text,uuid) from public;
revoke all on function public.submit_player_availability(text,uuid,jsonb) from public;
grant execute on function public.get_public_availability_form(text),public.get_public_player_availability(text,uuid),public.submit_player_availability(text,uuid,jsonb) to anon,authenticated;

create or replace function public.phase13_setup_status() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('links',to_regclass('public.tournament_availability_links') is not null,'availability',to_regclass('public.match_availability') is not null,'fixture_history',to_regclass('public.fixture_import_history') is not null,'public_form_rpc',to_regprocedure('public.get_public_availability_form(text)') is not null,'submit_rpc',to_regprocedure('public.submit_player_availability(text,uuid,jsonb)') is not null);
$$;
revoke all on function public.phase13_setup_status() from public;
grant execute on function public.phase13_setup_status() to anon,authenticated;
