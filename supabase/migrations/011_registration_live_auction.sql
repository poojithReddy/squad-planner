-- Squad Planner Phase 16: tournament registration and centrally administered auction.
-- Apply manually after 010_super_admin_multi_tournament.sql.

-- Repair the legacy team-owned tournament relationship for shared tournaments.
alter table public.matches drop constraint if exists matches_tournament_same_team_fkey;
alter table public.tournament_availability_links drop constraint if exists availability_link_tournament_team_fkey;
alter table public.match_availability drop constraint if exists match_availability_tournament_team_fkey;
alter table public.fixture_import_history drop constraint if exists fixture_import_tournament_team_fkey;
alter table public.matches add constraint matches_tournament_id_fkey foreign key(tournament_id) references public.tournaments(id) on delete cascade;
alter table public.tournament_availability_links add constraint availability_link_tournament_id_fkey foreign key(tournament_id) references public.tournaments(id) on delete cascade;
alter table public.match_availability add constraint match_availability_tournament_id_fkey foreign key(tournament_id) references public.tournaments(id) on delete cascade;
alter table public.fixture_import_history add constraint fixture_import_tournament_id_fkey foreign key(tournament_id) references public.tournaments(id) on delete cascade;

create or replace function private.validate_team_tournament_reference()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(
    select 1 from public.tournaments t join public.teams te on te.id=new.team_id
    where t.id=new.tournament_id and (te.tournament_id=t.id or t.team_id=te.id)
  ) then raise exception 'TEAM_TOURNAMENT_MISMATCH'; end if;
  return new;
end;$$;
revoke all on function private.validate_team_tournament_reference() from public;
create trigger matches_validate_team_tournament before insert or update of team_id,tournament_id on public.matches for each row execute function private.validate_team_tournament_reference();
create trigger availability_links_validate_team_tournament before insert or update of team_id,tournament_id on public.tournament_availability_links for each row execute function private.validate_team_tournament_reference();
create trigger match_availability_validate_team_tournament before insert or update of team_id,tournament_id on public.match_availability for each row execute function private.validate_team_tournament_reference();
create trigger fixture_import_validate_team_tournament before insert or update of team_id,tournament_id on public.fixture_import_history for each row execute function private.validate_team_tournament_reference();

create table public.registration_forms(
  id uuid primary key default gen_random_uuid(), tournament_id uuid not null unique references public.tournaments(id) on delete cascade,
  token_hash text not null unique, status text not null default 'draft' check(status in('draft','open','closed')),
  title text not null, description text, instructions text, banner_path text, logo_path text,
  closes_at timestamptz, submit_button_text text not null default 'Submit Registration',
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.registration_form_fields(
  id uuid primary key default gen_random_uuid(), form_id uuid not null references public.registration_forms(id) on delete cascade,
  field_key text not null, field_type text not null check(field_type in('short_text','long_text','rich_text','number','email','phone','dropdown','radio','checkbox','date','yes_no','image','profile_photo')),
  label text not null, help_text text, placeholder text, required boolean not null default false,
  display_order integer not null default 0, default_value jsonb, options jsonb not null default '[]'::jsonb,
  validation jsonb not null default '{}'::jsonb, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(form_id,field_key)
);
create table public.registration_submissions(
  id uuid primary key default gen_random_uuid(), form_id uuid not null references public.registration_forms(id) on delete restrict,
  tournament_id uuid not null references public.tournaments(id) on delete cascade, answers jsonb not null default '{}'::jsonb,
  email_normalized text, status text not null default 'registered' check(status in('registered','approved','rejected','withdrawn')),
  submitted_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null
);
create unique index registration_submission_email_unique on public.registration_submissions(tournament_id,email_normalized) where email_normalized is not null and status<>'withdrawn';

create table public.tournament_auction_buckets(
  id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null, description text, minimum_players_per_team integer not null default 0 check(minimum_players_per_team>=0),
  maximum_players_per_team integer check(maximum_players_per_team is null or maximum_players_per_team>=minimum_players_per_team),
  max_player_bid numeric(12,2) check(max_player_bid is null or max_player_bid>=0), display_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tournament_id,name)
);
create table public.tournament_players(
  id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
  registration_submission_id uuid unique references public.registration_submissions(id) on delete set null,
  name text not null, email text, phone text, role text not null, availability text not null default 'unknown' check(availability in('full','partial','unknown')),
  bucket_id uuid references public.tournament_auction_buckets(id) on delete set null,
  registration_status text not null default 'registered' check(registration_status in('registered','approved','rejected','withdrawn')),
  auction_status text not null default 'waiting' check(auction_status in('waiting','ready','bidding','sold','unsold','withdrawn')),
  photo_path text, answers jsonb not null default '{}'::jsonb, sold_team_id uuid references public.teams(id) on delete set null,
  sold_amount numeric(12,2) not null default 0 check(sold_amount>=0), deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null,
  constraint tournament_players_id_tournament_key unique(id,tournament_id)
);
alter table public.players add column tournament_player_id uuid references public.tournament_players(id) on delete set null;
create unique index players_team_tournament_player_unique on public.players(team_id,tournament_player_id) where tournament_player_id is not null;

create table public.tournament_auctions(
  id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null, auction_date date, start_time time, location text, meeting_link text,
  status text not null default 'draft' check(status in('draft','scheduled','live','paused','completed')),
  minimum_bid_increment numeric(12,2) not null default 1 check(minimum_bid_increment>0), current_player_id uuid references public.tournament_players(id) on delete set null,
  notes text, created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.auction_bids(
  id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
  auction_id uuid not null references public.tournament_auctions(id) on delete cascade, player_id uuid not null references public.tournament_players(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict, bidder_user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(12,2) not null check(amount>=0), created_at timestamptz not null default now()
);
create table public.tournament_auction_history(
  id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
  auction_id uuid not null references public.tournament_auctions(id) on delete cascade, player_id uuid references public.tournament_players(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null, action text not null check(action in('random_selected','bidding_started','sold','unsold','sale_undone','status_changed')),
  amount numeric(12,2), performed_by uuid not null references auth.users(id) on delete restrict, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index registration_fields_order_idx on public.registration_form_fields(form_id,is_active,display_order);
create index registration_submissions_tournament_idx on public.registration_submissions(tournament_id,status,submitted_at desc);
create index tournament_players_pool_idx on public.tournament_players(tournament_id,registration_status,auction_status,bucket_id);
create index tournament_auction_buckets_order_idx on public.tournament_auction_buckets(tournament_id,display_order);
create index tournament_auctions_status_idx on public.tournament_auctions(tournament_id,status);
create index auction_bids_leader_idx on public.auction_bids(auction_id,player_id,amount desc,created_at);
create index tournament_auction_history_idx on public.tournament_auction_history(auction_id,created_at desc);

create trigger registration_forms_updated before update on public.registration_forms for each row execute function private.set_updated_at();
create trigger registration_fields_updated before update on public.registration_form_fields for each row execute function private.set_updated_at();
create trigger registration_submissions_updated before update on public.registration_submissions for each row execute function private.set_updated_at();
create trigger tournament_buckets_updated before update on public.tournament_auction_buckets for each row execute function private.set_updated_at();
create trigger tournament_players_updated before update on public.tournament_players for each row execute function private.set_updated_at();
create trigger tournament_auctions_updated before update on public.tournament_auctions for each row execute function private.set_updated_at();

alter table public.registration_forms enable row level security; alter table public.registration_form_fields enable row level security;
alter table public.registration_submissions enable row level security; alter table public.tournament_players enable row level security;
alter table public.tournament_auction_buckets enable row level security; alter table public.tournament_auctions enable row level security;
alter table public.auction_bids enable row level security; alter table public.tournament_auction_history enable row level security;

create policy "Tournament admins manage registration forms" on public.registration_forms for all to authenticated using((select private.is_tournament_admin(tournament_id))) with check((select private.is_tournament_admin(tournament_id)));
create policy "Tournament admins manage registration fields" on public.registration_form_fields for all to authenticated using(exists(select 1 from public.registration_forms f where f.id=form_id and private.is_tournament_admin(f.tournament_id))) with check(exists(select 1 from public.registration_forms f where f.id=form_id and private.is_tournament_admin(f.tournament_id)));
create policy "Tournament admins manage submissions" on public.registration_submissions for all to authenticated using((select private.is_tournament_admin(tournament_id))) with check((select private.is_tournament_admin(tournament_id)));
create policy "Tournament admins manage player pool" on public.tournament_players for all to authenticated using((select private.is_tournament_admin(tournament_id))) with check((select private.is_tournament_admin(tournament_id)));
create policy "Tournament admins manage auction buckets" on public.tournament_auction_buckets for all to authenticated using((select private.is_tournament_admin(tournament_id))) with check((select private.is_tournament_admin(tournament_id)));
create policy "Tournament admins manage auctions" on public.tournament_auctions for all to authenticated using((select private.is_tournament_admin(tournament_id))) with check((select private.is_tournament_admin(tournament_id)));
create policy "Tournament members view auctions" on public.tournament_auctions for select to authenticated using((select private.is_tournament_member(tournament_id)) or (select private.is_managed_team_member(tournament_id)));
create policy "Tournament admins view all bids" on public.auction_bids for select to authenticated using((select private.is_tournament_admin(tournament_id)));
create policy "Team bidders view tournament bids" on public.auction_bids for select to authenticated using((select private.is_team_member(team_id)));
create policy "Tournament participants view auction history" on public.tournament_auction_history for select to authenticated using((select private.is_tournament_member(tournament_id)) or (select private.is_managed_team_member(tournament_id)));
grant select,insert,update,delete on public.registration_forms,public.registration_form_fields,public.registration_submissions,public.tournament_players,public.tournament_auction_buckets,public.tournament_auctions to authenticated;
grant select on public.auction_bids,public.tournament_auction_history to authenticated;

-- Public access is RPC-only; raw form/submission/player-pool tables remain closed to anon.
create or replace function public.get_public_registration_form(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('form',jsonb_build_object('id',f.id,'title',f.title,'description',f.description,'instructions',f.instructions,'submit_button_text',f.submit_button_text,'status',f.status,'closes_at',f.closes_at),'tournament',jsonb_build_object('name',t.name,'start_date',t.start_date,'end_date',t.end_date),'fields',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'field_key',x.field_key,'field_type',x.field_type,'label',x.label,'help_text',x.help_text,'placeholder',x.placeholder,'required',x.required,'default_value',x.default_value,'options',x.options,'validation',x.validation) order by x.display_order) from public.registration_form_fields x where x.form_id=f.id and x.is_active),'[]'::jsonb))
from public.registration_forms f join public.tournaments t on t.id=f.tournament_id where f.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') limit 1;
$$;

create or replace function public.submit_public_registration(p_token text,p_answers jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare f public.registration_forms;field record;v_email text;v_id uuid;v_name text;v_role text;
begin
 select * into f from public.registration_forms where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found then raise exception 'REGISTRATION_LINK_INVALID';end if;
 if f.status<>'open' or (f.closes_at is not null and f.closes_at<now()) then raise exception 'REGISTRATION_CLOSED';end if;
 for field in select * from public.registration_form_fields where form_id=f.id and is_active and required and field_type<>'rich_text' loop
   if not (p_answers ? field.field_key) or nullif(trim(coalesce(p_answers->>field.field_key,'')),'') is null then raise exception 'REQUIRED_FIELD:%',field.field_key;end if;
 end loop;
 select lower(trim(p_answers->>field_key)) into v_email from public.registration_form_fields where form_id=f.id and is_active and field_type='email' and p_answers ? field_key order by display_order limit 1;
 insert into public.registration_submissions(form_id,tournament_id,answers,email_normalized) values(f.id,f.tournament_id,p_answers,nullif(v_email,'')) returning id into v_id;
 select p_answers->>field_key into v_name from public.registration_form_fields where form_id=f.id and is_active and lower(label) in('name','player name','full name') order by display_order limit 1;
 select p_answers->>field_key into v_role from public.registration_form_fields where form_id=f.id and is_active and lower(label) in('role','player role','primary playing role') order by display_order limit 1;
 insert into public.tournament_players(tournament_id,registration_submission_id,name,email,role,answers)
 values(f.tournament_id,v_id,coalesce(nullif(trim(v_name),''),'Registered Player'),v_email,coalesce(nullif(trim(v_role),''),'Other'),p_answers);
 return v_id;
exception when unique_violation then raise exception 'DUPLICATE_REGISTRATION';end;$$;

create or replace function public.sync_tournament_player_to_teams(p_player_id uuid) returns integer language plpgsql security definer set search_path='' as $$
declare p public.tournament_players;v_count integer;
begin
 select * into p from public.tournament_players where id=p_player_id for update;
 if not found or not private.is_tournament_admin(p.tournament_id) then raise exception 'TOURNAMENT_ADMIN_FORBIDDEN';end if;
 if p.registration_status<>'approved' then raise exception 'PLAYER_NOT_APPROVED';end if;
 insert into public.players(team_id,tournament_player_id,name,role,availability_status,auction_status)
 select te.id,p.id,p.name,p.role,p.availability,'available' from public.teams te where te.tournament_id=p.tournament_id
 on conflict(team_id,tournament_player_id) where tournament_player_id is not null do update set name=excluded.name,role=excluded.role,availability_status=excluded.availability_status;
 get diagnostics v_count=row_count;return v_count;
end;$$;

create or replace function public.pick_random_auction_player(p_auction_id uuid,p_bucket_id uuid) returns public.tournament_players language plpgsql security definer set search_path='' as $$
declare a public.tournament_auctions;p public.tournament_players;
begin
 select * into a from public.tournament_auctions where id=p_auction_id for update;
 if not found or not private.is_tournament_admin(a.tournament_id) then raise exception 'AUCTION_ADMIN_FORBIDDEN';end if;
 if a.status not in('scheduled','live','paused') then raise exception 'AUCTION_NOT_LIVE';end if;
 select * into p from public.tournament_players where tournament_id=a.tournament_id and bucket_id=p_bucket_id and registration_status='approved' and auction_status in('waiting','ready','unsold') and deleted_at is null order by random() limit 1 for update skip locked;
 if not found then raise exception 'NO_ELIGIBLE_PLAYER';end if;
 update public.tournament_players set auction_status='ready' where id=p.id returning * into p;update public.tournament_auctions set current_player_id=p.id where id=a.id;
 insert into public.tournament_auction_history(tournament_id,auction_id,player_id,action,performed_by) values(a.tournament_id,a.id,p.id,'random_selected',(select auth.uid()));return p;
end;$$;

create or replace function public.place_tournament_bid(p_auction_id uuid,p_team_id uuid,p_amount numeric) returns public.auction_bids language plpgsql security definer set search_path='' as $$
declare a public.tournament_auctions;p public.tournament_players;v_high numeric:=0;v_spent numeric:=0;v_budget numeric;v_max numeric;v_count integer;v_bucket_max integer;b public.auction_bids;
begin
 if not private.has_team_role(p_team_id,array['owner','captain','vice_captain','manager']::text[]) then raise exception 'BID_FORBIDDEN';end if;
 select * into a from public.tournament_auctions where id=p_auction_id for update;if not found or a.status<>'live' or a.current_player_id is null then raise exception 'AUCTION_NOT_LIVE';end if;
 if not exists(select 1 from public.teams where id=p_team_id and tournament_id=a.tournament_id) then raise exception 'TEAM_NOT_IN_TOURNAMENT';end if;
 select * into p from public.tournament_players where id=a.current_player_id for update;if p.auction_status<>'bidding' then raise exception 'PLAYER_NOT_BIDDING';end if;
 select coalesce(max(amount),0) into v_high from public.auction_bids where auction_id=a.id and player_id=p.id;
 if p_amount<v_high+a.minimum_bid_increment then raise exception 'BID_TOO_LOW';end if;
 select total_auction_budget into v_budget from public.teams where id=p_team_id;select coalesce(sum(sold_amount),0) into v_spent from public.tournament_players where sold_team_id=p_team_id and auction_status='sold';
 if p_amount>v_budget-v_spent then raise exception 'BID_EXCEEDS_BUDGET';end if;
 select max_player_bid,maximum_players_per_team into v_max,v_bucket_max from public.tournament_auction_buckets where id=p.bucket_id;
 if v_max is not null and p_amount>v_max then raise exception 'BID_EXCEEDS_BUCKET_MAX';end if;
 select count(*) into v_count from public.tournament_players where sold_team_id=p_team_id and bucket_id=p.bucket_id and auction_status='sold';if v_bucket_max is not null and v_count>=v_bucket_max then raise exception 'TEAM_BUCKET_FULL';end if;
 insert into public.auction_bids(tournament_id,auction_id,player_id,team_id,bidder_user_id,amount) values(a.tournament_id,a.id,p.id,p_team_id,(select auth.uid()),p_amount) returning * into b;return b;
end;$$;

create or replace function public.confirm_tournament_sale(p_auction_id uuid,p_bid_id uuid) returns public.tournament_players language plpgsql security definer set search_path='' as $$
declare a public.tournament_auctions;b public.auction_bids;p public.tournament_players;v_high uuid;
begin
 select * into a from public.tournament_auctions where id=p_auction_id for update;if not found or not private.is_tournament_admin(a.tournament_id) then raise exception 'AUCTION_ADMIN_FORBIDDEN';end if;
 select id into v_high from public.auction_bids where auction_id=a.id and player_id=a.current_player_id order by amount desc,created_at asc limit 1;if v_high is distinct from p_bid_id then raise exception 'WINNING_BID_CHANGED';end if;
 select * into b from public.auction_bids where id=p_bid_id for update;select * into p from public.tournament_players where id=b.player_id for update;if p.auction_status<>'bidding' then raise exception 'PLAYER_NOT_BIDDING';end if;
 update public.tournament_players set auction_status='sold',sold_team_id=b.team_id,sold_amount=b.amount where id=p.id returning * into p;
 update public.players set auction_status=case when team_id=b.team_id then 'my_team' else 'other_team' end,sold_price=case when team_id=b.team_id then b.amount else 0 end where tournament_player_id=p.id;
 insert into public.tournament_auction_history(tournament_id,auction_id,player_id,team_id,action,amount,performed_by) values(a.tournament_id,a.id,p.id,b.team_id,'sold',b.amount,(select auth.uid()));return p;
end;$$;

create or replace function public.set_tournament_auction_player(p_auction_id uuid,p_player_id uuid,p_expected_status text default 'ready') returns public.tournament_players language plpgsql security definer set search_path='' as $$
declare a public.tournament_auctions;p public.tournament_players;
begin
 select * into a from public.tournament_auctions where id=p_auction_id for update;if not found or not private.is_tournament_admin(a.tournament_id) then raise exception 'AUCTION_ADMIN_FORBIDDEN';end if;
 if a.status not in('scheduled','live','paused') then raise exception 'AUCTION_NOT_ACTIVE';end if;
 select * into p from public.tournament_players where id=p_player_id and tournament_id=a.tournament_id and deleted_at is null for update;if not found or p.auction_status<>p_expected_status then raise exception 'PLAYER_STATUS_CHANGED';end if;
 update public.tournament_players set auction_status='bidding',updated_at=now(),updated_by=(select auth.uid()) where id=p.id returning * into p;update public.tournament_auctions set current_player_id=p.id,status='live',updated_at=now() where id=a.id;
 insert into public.tournament_auction_history(tournament_id,auction_id,player_id,action,performed_by) values(a.tournament_id,a.id,p.id,'bidding_started',(select auth.uid()));return p;
end;$$;

create or replace function public.mark_tournament_player_unsold(p_auction_id uuid,p_player_id uuid) returns public.tournament_players language plpgsql security definer set search_path='' as $$
declare a public.tournament_auctions;p public.tournament_players;
begin
 select * into a from public.tournament_auctions where id=p_auction_id for update;if not found or not private.is_tournament_admin(a.tournament_id) then raise exception 'AUCTION_ADMIN_FORBIDDEN';end if;
 select * into p from public.tournament_players where id=p_player_id and tournament_id=a.tournament_id for update;if not found or p.auction_status<>'bidding' then raise exception 'PLAYER_STATUS_CHANGED';end if;
 update public.tournament_players set auction_status='unsold',sold_team_id=null,sold_amount=0,updated_at=now(),updated_by=(select auth.uid()) where id=p.id returning * into p;update public.tournament_auctions set current_player_id=null,updated_at=now() where id=a.id;
 insert into public.tournament_auction_history(tournament_id,auction_id,player_id,action,performed_by) values(a.tournament_id,a.id,p.id,'unsold',(select auth.uid()));return p;
end;$$;

create or replace function public.undo_tournament_sale(p_auction_id uuid,p_player_id uuid) returns public.tournament_players language plpgsql security definer set search_path='' as $$
declare a public.tournament_auctions;p public.tournament_players;
begin
 select * into a from public.tournament_auctions where id=p_auction_id for update;if not found or not private.is_tournament_admin(a.tournament_id) then raise exception 'AUCTION_ADMIN_FORBIDDEN';end if;
 select * into p from public.tournament_players where id=p_player_id and tournament_id=a.tournament_id for update;if not found or p.auction_status not in('sold','unsold') then raise exception 'PLAYER_STATUS_CHANGED';end if;
 update public.tournament_players set auction_status='ready',sold_team_id=null,sold_amount=0,updated_at=now(),updated_by=(select auth.uid()) where id=p.id returning * into p;update public.players set auction_status='available',sold_price=0 where tournament_player_id=p.id;
 insert into public.tournament_auction_history(tournament_id,auction_id,player_id,action,amount,performed_by) values(a.tournament_id,a.id,p.id,'sale_undone',0,(select auth.uid()));return p;
end;$$;

revoke all on function public.get_public_registration_form(text),public.submit_public_registration(text,jsonb),public.sync_tournament_player_to_teams(uuid),public.pick_random_auction_player(uuid,uuid),public.place_tournament_bid(uuid,uuid,numeric),public.confirm_tournament_sale(uuid,uuid),public.set_tournament_auction_player(uuid,uuid,text),public.mark_tournament_player_unsold(uuid,uuid),public.undo_tournament_sale(uuid,uuid) from public;
grant execute on function public.get_public_registration_form(text),public.submit_public_registration(text,jsonb) to anon,authenticated;
grant execute on function public.sync_tournament_player_to_teams(uuid),public.pick_random_auction_player(uuid,uuid),public.place_tournament_bid(uuid,uuid,numeric),public.confirm_tournament_sale(uuid,uuid),public.set_tournament_auction_player(uuid,uuid,text),public.mark_tournament_player_unsold(uuid,uuid),public.undo_tournament_sale(uuid,uuid) to authenticated;

alter table public.tournament_auctions replica identity full;alter table public.auction_bids replica identity full;alter table public.tournament_players replica identity full;
do $$ begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tournament_auctions') then alter publication supabase_realtime add table public.tournament_auctions;end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='auction_bids') then alter publication supabase_realtime add table public.auction_bids;end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tournament_players') then alter publication supabase_realtime add table public.tournament_players;end if;
end if;end$$;

create or replace function public.phase16_setup_status() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_build_object(
 'registration',to_regclass('public.registration_forms') is not null,'player_pool',to_regclass('public.tournament_players') is not null,
 'auction',to_regclass('public.tournament_auctions') is not null,'bids',to_regclass('public.auction_bids') is not null,
 'public_submit',to_regprocedure('public.submit_public_registration(text,jsonb)') is not null,'atomic_bid',to_regprocedure('public.place_tournament_bid(uuid,uuid,numeric)') is not null,
 'atomic_sale',to_regprocedure('public.confirm_tournament_sale(uuid,uuid)') is not null,'shared_tournament_fix',to_regprocedure('private.validate_team_tournament_reference()') is not null);
$$;revoke all on function public.phase16_setup_status() from public;grant execute on function public.phase16_setup_status() to anon,authenticated;
