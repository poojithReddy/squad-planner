-- Phase 6: volunteer duties and assignments. Apply after Migration 004.
create table public.volunteer_duties(
 id uuid primary key default gen_random_uuid(),team_id uuid not null references public.teams(id) on delete cascade,match_id uuid,
 duty_date date not null,duty_time time,duty_type text not null check(char_length(trim(duty_type))>0),description text,
 required_people integer not null default 1 check(required_people>0),status text not null default 'open' check(status in('open','assigned','completed','cancelled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint volunteer_duties_match_same_team_fkey foreign key(team_id,match_id) references public.matches(team_id,id) on delete set null(match_id),
 constraint volunteer_duties_team_id_id_key unique(team_id,id)
);
create table public.volunteer_duty_assignments(
 id uuid primary key default gen_random_uuid(),duty_id uuid not null,team_id uuid not null references public.teams(id) on delete cascade,player_id uuid not null,
 notes text,completed boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint duty_assignments_duty_same_team_fkey foreign key(team_id,duty_id) references public.volunteer_duties(team_id,id) on delete cascade,
 constraint duty_assignments_player_same_team_fkey foreign key(team_id,player_id) references public.players(team_id,id) on delete restrict,
 constraint duty_assignments_duty_player_key unique(duty_id,player_id)
);
create index volunteer_duties_team_date_idx on public.volunteer_duties(team_id,duty_date,duty_time);create index volunteer_duties_status_idx on public.volunteer_duties(team_id,status);create index duty_assignments_player_idx on public.volunteer_duty_assignments(team_id,player_id);create index duty_assignments_duty_idx on public.volunteer_duty_assignments(duty_id);
create trigger volunteer_duties_set_updated_at before update on public.volunteer_duties for each row execute function private.set_updated_at();create trigger volunteer_duty_assignments_set_updated_at before update on public.volunteer_duty_assignments for each row execute function private.set_updated_at();
alter table public.volunteer_duties enable row level security;alter table public.volunteer_duty_assignments enable row level security;
create policy "Members read duties" on public.volunteer_duties for select to authenticated using((select private.is_team_member(team_id)));create policy "Managers create duties" on public.volunteer_duties for insert to authenticated with check((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));create policy "Managers update duties" on public.volunteer_duties for update to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[]))) with check((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));create policy "Managers delete duties" on public.volunteer_duties for delete to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
create policy "Members read duty assignments" on public.volunteer_duty_assignments for select to authenticated using((select private.is_team_member(team_id)));create policy "Managers update duty assignments" on public.volunteer_duty_assignments for update to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[]))) with check((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));create policy "Managers delete duty assignments" on public.volunteer_duty_assignments for delete to authenticated using((select private.has_team_role(team_id,array['owner','captain','vice_captain','manager']::text[])));
grant select,insert,update,delete on public.volunteer_duties to authenticated;grant select,update,delete on public.volunteer_duty_assignments to authenticated;
create or replace function public.assign_volunteer(p_team_id uuid,p_duty_id uuid,p_player_id uuid,p_notes text default null,p_override boolean default false) returns public.volunteer_duty_assignments language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();d public.volunteer_duties;a public.volunteer_duty_assignments;assigned_count int;conflicts text[]:=array[]::text[];
begin
 if u is null or not private.has_team_role(p_team_id,array['owner','captain','vice_captain','manager']::text[]) then raise exception 'DUTY_FORBIDDEN';end if;
 select * into d from public.volunteer_duties where id=p_duty_id and team_id=p_team_id for update;if not found then raise exception 'DUTY_NOT_FOUND';end if;
 if not exists(select 1 from public.players where id=p_player_id and team_id=p_team_id and auction_status='my_team') then raise exception 'PLAYER_NOT_IN_SQUAD';end if;
 if exists(select 1 from public.volunteer_duty_assignments where duty_id=p_duty_id and player_id=p_player_id) then raise exception 'DUPLICATE_ASSIGNMENT';end if;
 select count(*) into assigned_count from public.volunteer_duty_assignments where duty_id=p_duty_id;
 if assigned_count>=d.required_people then conflicts:=array_append(conflicts,'REQUIRED_COUNT_EXCEEDED');end if;
 if d.match_id is not null and exists(select 1 from public.match_players where match_id=d.match_id and player_id=p_player_id and selected and playing_status in('selected','playing','substitute')) then conflicts:=array_append(conflicts,'PLAYER_IN_RELATED_MATCH');end if;
 if d.match_id is not null and exists(select 1 from public.match_players where match_id=d.match_id and player_id=p_player_id and (playing_status='unavailable' or availability_override='unavailable')) then conflicts:=array_append(conflicts,'PLAYER_UNAVAILABLE');end if;
 if exists(select 1 from public.volunteer_duty_assignments x join public.volunteer_duties od on od.id=x.duty_id where x.team_id=p_team_id and x.player_id=p_player_id and od.duty_date=d.duty_date and od.duty_time is not distinct from d.duty_time and od.status<>'cancelled') then conflicts:=array_append(conflicts,'SAME_TIME_DUTY');end if;
 if array_length(conflicts,1)>0 and not p_override then raise exception 'DUTY_CONFLICT:%',array_to_string(conflicts,',');end if;
 insert into public.volunteer_duty_assignments(duty_id,team_id,player_id,notes) values(p_duty_id,p_team_id,p_player_id,nullif(trim(p_notes),'')) returning * into a;
 if assigned_count+1>=d.required_people and d.status='open' then update public.volunteer_duties set status='assigned' where id=d.id;end if;return a;
end;$$;
revoke all on function public.assign_volunteer(uuid,uuid,uuid,text,boolean) from public;grant execute on function public.assign_volunteer(uuid,uuid,uuid,text,boolean) to authenticated;
do $$ begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='volunteer_duties') then execute 'alter publication supabase_realtime add table public.volunteer_duties';end if;if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='volunteer_duty_assignments') then execute 'alter publication supabase_realtime add table public.volunteer_duty_assignments';end if;end if;end$$;
create or replace function public.phase6_setup_status() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('duties',to_regclass('public.volunteer_duties') is not null,'assignments',to_regclass('public.volunteer_duty_assignments') is not null,'assign_rpc',to_regprocedure('public.assign_volunteer(uuid,uuid,uuid,text,boolean)') is not null,'realtime',exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='volunteer_duty_assignments'));$$;revoke all on function public.phase6_setup_status() from public;grant execute on function public.phase6_setup_status() to anon,authenticated;
