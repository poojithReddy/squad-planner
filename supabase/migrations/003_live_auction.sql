-- Squad Planner Phase 4: live auction lifecycle, atomic decisions and audit history.
-- Apply manually after 002_players_buckets_planning.sql.

alter table public.teams
  add column auction_status text not null default 'planning'
  constraint teams_auction_status_check check (auction_status in ('planning', 'live', 'completed'));

create table public.auction_history (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null,
  action text not null check (action in ('sold_to_my_team','sold_to_other_team','undo','bucket_max_override')),
  previous_status text check (previous_status is null or previous_status in ('available','my_team','other_team')),
  new_status text check (new_status is null or new_status in ('available','my_team','other_team')),
  previous_price numeric(12,2) check (previous_price is null or previous_price >= 0),
  new_price numeric(12,2) check (new_price is null or new_price >= 0),
  performed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint auction_history_player_same_team_fkey
    foreign key (team_id, player_id) references public.players(team_id, id) on delete restrict
);

create table public.auction_lifecycle_history (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  previous_status text not null check (previous_status in ('planning','live','completed')),
  new_status text not null check (new_status in ('planning','live','completed')),
  performed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index auction_history_team_created_idx on public.auction_history(team_id, created_at desc);
create index auction_history_player_idx on public.auction_history(player_id, created_at desc);
create index auction_lifecycle_history_team_idx on public.auction_lifecycle_history(team_id, created_at desc);
create index players_team_role_idx on public.players(team_id, role);
create index players_team_priority_idx on public.players(team_id, priority);
create index players_team_bucket_status_idx on public.players(team_id, bucket_id, auction_status);

alter table public.auction_history enable row level security;
alter table public.auction_lifecycle_history enable row level security;

create policy "Members can read auction history"
on public.auction_history for select to authenticated
using ((select private.is_team_member(team_id)));

create policy "Members can read auction lifecycle history"
on public.auction_lifecycle_history for select to authenticated
using ((select private.is_team_member(team_id)));

grant select on public.auction_history to authenticated;
grant select on public.auction_lifecycle_history to authenticated;

-- The expected status is an optimistic concurrency token. The row lock plus the
-- comparison prevents a stale device from overwriting a decision made elsewhere.
create or replace function public.update_player_auction_status(
  p_team_id uuid,
  p_player_id uuid,
  p_expected_status text,
  p_new_status text,
  p_sold_price numeric default 0,
  p_override_squad_limit boolean default false,
  p_override_bucket_max boolean default false
)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_player public.players;
  updated_player public.players;
  team_squad_size integer;
  current_squad_count integer;
  bucket_maximum integer;
  current_bucket_count integer;
  history_action text;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.has_team_role(p_team_id, array['owner','captain','vice_captain','manager']::text[]) then
    raise exception 'AUCTION_READ_ONLY';
  end if;
  if p_expected_status not in ('available','my_team','other_team')
     or p_new_status not in ('available','my_team','other_team') then
    raise exception 'INVALID_AUCTION_STATUS';
  end if;
  if p_sold_price is null or p_sold_price < 0 then raise exception 'INVALID_SOLD_PRICE'; end if;

  select * into current_player
  from public.players
  where id = p_player_id and team_id = p_team_id
  for update;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if current_player.auction_status <> p_expected_status then
    raise exception 'AUCTION_CONFLICT' using errcode = '40001';
  end if;
  if current_player.auction_status = p_new_status then raise exception 'NO_STATUS_CHANGE'; end if;
  if (current_player.auction_status = 'available' and p_new_status not in ('my_team','other_team'))
     or (current_player.auction_status in ('my_team','other_team') and p_new_status <> 'available') then
    raise exception 'INVALID_AUCTION_TRANSITION';
  end if;

  if p_new_status = 'my_team' then
    select squad_size into team_squad_size from public.teams where id = p_team_id;
    select count(*) into current_squad_count from public.players where team_id = p_team_id and auction_status = 'my_team';
    if current_squad_count >= team_squad_size and not p_override_squad_limit then
      raise exception 'SQUAD_LIMIT:%', team_squad_size;
    end if;
    if current_player.bucket_id is not null then
      select maximum_players into bucket_maximum from public.auction_buckets where id = current_player.bucket_id and team_id = p_team_id;
      select count(*) into current_bucket_count from public.players where team_id = p_team_id and bucket_id = current_player.bucket_id and auction_status = 'my_team';
      if bucket_maximum is not null and current_bucket_count >= bucket_maximum and not p_override_bucket_max then
        raise exception 'BUCKET_MAX:%', bucket_maximum;
      end if;
    end if;
  end if;

  update public.players
  set auction_status = p_new_status,
      sold_price = case when p_new_status = 'my_team' then p_sold_price else 0 end
  where id = p_player_id and team_id = p_team_id
  returning * into updated_player;

  history_action := case
    when p_new_status = 'my_team' then 'sold_to_my_team'
    when p_new_status = 'other_team' then 'sold_to_other_team'
    else 'undo'
  end;
  insert into public.auction_history(team_id,player_id,action,previous_status,new_status,previous_price,new_price,performed_by)
  values (p_team_id,p_player_id,history_action,current_player.auction_status,updated_player.auction_status,current_player.sold_price,updated_player.sold_price,current_user_id);
  if p_new_status = 'my_team' and p_override_bucket_max then
    insert into public.auction_history(team_id,player_id,action,previous_status,new_status,previous_price,new_price,performed_by)
    values (p_team_id,p_player_id,'bucket_max_override',current_player.auction_status,updated_player.auction_status,current_player.sold_price,updated_player.sold_price,current_user_id);
  end if;
  return updated_player;
end;
$$;

create or replace function public.update_auction_lifecycle(
  p_team_id uuid,
  p_expected_status text,
  p_new_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_status text;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.has_team_role(p_team_id, array['owner','captain']::text[]) then raise exception 'LIFECYCLE_FORBIDDEN'; end if;
  if p_new_status not in ('planning','live','completed') then raise exception 'INVALID_LIFECYCLE_STATUS'; end if;
  select auction_status into current_status from public.teams where id = p_team_id for update;
  if not found then raise exception 'TEAM_NOT_FOUND'; end if;
  if current_status <> p_expected_status then raise exception 'LIFECYCLE_CONFLICT' using errcode = '40001'; end if;
  if current_status = p_new_status then return current_status; end if;
  update public.teams set auction_status = p_new_status where id = p_team_id;
  insert into public.auction_lifecycle_history(team_id,previous_status,new_status,performed_by)
  values (p_team_id,current_status,p_new_status,current_user_id);
  return p_new_status;
end;
$$;

revoke all on function public.update_player_auction_status(uuid,uuid,text,text,numeric,boolean,boolean) from public;
grant execute on function public.update_player_auction_status(uuid,uuid,text,text,numeric,boolean,boolean) to authenticated;
revoke all on function public.update_auction_lifecycle(uuid,text,text) from public;
grant execute on function public.update_auction_lifecycle(uuid,text,text) to authenticated;

-- Realtime remains subject to table RLS. These guarded statements are safe when
-- a table was already added to the Supabase publication.
alter table public.players replica identity full;
alter table public.teams replica identity full;
do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='players') then execute 'alter publication supabase_realtime add table public.players'; end if;
    if not exists (select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='auction_history') then execute 'alter publication supabase_realtime add table public.auction_history'; end if;
    if not exists (select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='teams') then execute 'alter publication supabase_realtime add table public.teams'; end if;
  end if;
end $$;

create or replace function public.phase4_setup_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'auction_history', to_regclass('public.auction_history') is not null,
    'lifecycle_history', to_regclass('public.auction_lifecycle_history') is not null,
    'auction_rpc', to_regprocedure('public.update_player_auction_status(uuid,uuid,text,text,numeric,boolean,boolean)') is not null,
    'lifecycle_rpc', to_regprocedure('public.update_auction_lifecycle(uuid,text,text)') is not null,
    'realtime_players', exists(select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='players'),
    'realtime_history', exists(select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='auction_history')
  );
$$;
revoke all on function public.phase4_setup_status() from public;
grant execute on function public.phase4_setup_status() to anon, authenticated;
