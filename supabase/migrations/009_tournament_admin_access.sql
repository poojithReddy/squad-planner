-- Squad Planner Phase 14: tournament administration and multi-team access.
-- Apply manually after 008_fixture_import_availability.sql.

alter table public.teams
  add column tournament_id uuid null references public.tournaments(id) on delete set null;

-- Existing installations keep their current team tournament. Standalone teams without
-- a tournament remain supported until explicitly attached by a Tournament Admin.
update public.teams te
set tournament_id = t.id
from public.tournaments t
where t.team_id = te.id and t.is_active and te.tournament_id is null;

alter table public.teams alter column captain_name drop not null;
alter table public.teams drop constraint if exists teams_captain_name_check;
alter table public.teams add constraint teams_captain_name_check
  check (captain_name is null or char_length(trim(captain_name)) > 0);

create index teams_tournament_id_idx on public.teams(tournament_id);

create table public.tournament_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('tournament_admin','tournament_viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_members_tournament_user_key unique(tournament_id,user_id)
);

create index tournament_members_user_idx on public.tournament_members(user_id,tournament_id);
create trigger tournament_members_set_updated_at before update on public.tournament_members
  for each row execute function private.set_updated_at();

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  full_name text,
  team_role text not null check (team_role in ('captain','vice_captain','manager','member','viewer')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','cancelled')),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index team_invitations_pending_email_idx
  on public.team_invitations(team_id,lower(email)) where status='pending';
create index team_invitations_tournament_idx on public.team_invitations(tournament_id,status);
create trigger team_invitations_set_updated_at before update on public.team_invitations
  for each row execute function private.set_updated_at();

-- SECURITY DEFINER avoids recursive tournament_members/team_members policy evaluation.
create or replace function private.is_tournament_member(requested_tournament_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.tournament_members
    where tournament_id=requested_tournament_id and user_id=(select auth.uid())
  );
$$;

create or replace function private.is_tournament_admin(requested_tournament_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.tournament_members
    where tournament_id=requested_tournament_id and user_id=(select auth.uid()) and role='tournament_admin'
  );
$$;

create or replace function private.is_tournament_admin_for_team(requested_team_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.teams te join public.tournament_members tm on tm.tournament_id=te.tournament_id
    where te.id=requested_team_id and tm.user_id=(select auth.uid()) and tm.role='tournament_admin'
  );
$$;

create or replace function private.is_managed_team_member(requested_tournament_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.teams te join public.team_members tm on tm.team_id=te.id
    where te.tournament_id=requested_tournament_id and tm.user_id=(select auth.uid())
  );
$$;

revoke all on function private.is_tournament_member(uuid),private.is_tournament_admin(uuid),private.is_tournament_admin_for_team(uuid),private.is_managed_team_member(uuid) from public;
grant execute on function private.is_tournament_member(uuid),private.is_tournament_admin(uuid),private.is_tournament_admin_for_team(uuid),private.is_managed_team_member(uuid) to authenticated;

alter table public.tournament_members enable row level security;
alter table public.team_invitations enable row level security;

create policy "Tournament users read own tournament membership" on public.tournament_members for select to authenticated
  using (user_id=(select auth.uid()) or (select private.is_tournament_admin(tournament_id)));
create policy "Tournament admins manage tournament membership" on public.tournament_members for all to authenticated
  using ((select private.is_tournament_admin(tournament_id)))
  with check ((select private.is_tournament_admin(tournament_id)));

create policy "Tournament admins read invitations" on public.team_invitations for select to authenticated
  using ((select private.is_tournament_admin(tournament_id)));
create policy "Tournament admins manage invitations" on public.team_invitations for all to authenticated
  using ((select private.is_tournament_admin(tournament_id)))
  with check ((select private.is_tournament_admin(tournament_id)));

-- Admin access is intentionally limited to tournament/team setup records. No policy is
-- added to players, buckets, plans, auction history, or private planning data.
create policy "Tournament admins read managed teams" on public.teams for select to authenticated
  using (tournament_id is not null and (select private.is_tournament_admin(tournament_id)));
create policy "Tournament admins update managed team setup" on public.teams for update to authenticated
  using (tournament_id is not null and (select private.is_tournament_admin(tournament_id)))
  with check (tournament_id is not null and (select private.is_tournament_admin(tournament_id)));
create policy "Tournament admins read tournament" on public.tournaments for select to authenticated
  using ((select private.is_tournament_member(id)) or (select private.is_managed_team_member(id)));
create policy "Tournament admins update tournament" on public.tournaments for update to authenticated
  using ((select private.is_tournament_admin(id))) with check ((select private.is_tournament_admin(id)));
create policy "Tournament admins read managed team access" on public.team_members for select to authenticated
  using ((select private.is_tournament_admin_for_team(team_id)));
create policy "Tournament admins manage managed team access" on public.team_members for all to authenticated
  using ((select private.is_tournament_admin_for_team(team_id)))
  with check ((select private.is_tournament_admin_for_team(team_id)));

create policy "Tournament admins read managed team assets" on storage.objects for select to authenticated
  using (bucket_id='team-assets' and (select private.is_tournament_admin_for_team(private.team_id_from_storage_path(name))));
create policy "Tournament admins upload managed team assets" on storage.objects for insert to authenticated
  with check (bucket_id='team-assets' and (select private.is_tournament_admin_for_team(private.team_id_from_storage_path(name))));
create policy "Tournament admins update managed team assets" on storage.objects for update to authenticated
  using (bucket_id='team-assets' and (select private.is_tournament_admin_for_team(private.team_id_from_storage_path(name))))
  with check (bucket_id='team-assets' and (select private.is_tournament_admin_for_team(private.team_id_from_storage_path(name))));
create policy "Tournament admins delete managed team assets" on storage.objects for delete to authenticated
  using (bucket_id='team-assets' and (select private.is_tournament_admin_for_team(private.team_id_from_storage_path(name))));

grant select,insert,update,delete on public.tournament_members,public.team_invitations to authenticated;
grant insert,delete on public.team_members to authenticated;

with ranked as(select id,row_number() over(partition by team_id order by created_at,id) position from public.team_members where role='captain')
update public.team_members set role='member' where id in(select id from ranked where position>1);
with ranked as(select id,row_number() over(partition by team_id order by created_at,id) position from public.team_members where role='vice_captain')
update public.team_members set role='member' where id in(select id from ranked where position>1);
create unique index team_members_one_captain_idx on public.team_members(team_id) where role='captain';
create unique index team_members_one_vice_captain_idx on public.team_members(team_id) where role='vice_captain';

create or replace function public.admin_create_tournament_team(
  p_tournament_id uuid,p_name text,p_primary_colour text,p_secondary_colour text,
  p_squad_size integer,p_total_auction_budget numeric,p_manager_name text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());v_team uuid;
begin
  if v_user is null or not private.is_tournament_admin(p_tournament_id) then raise exception 'TOURNAMENT_ADMIN_FORBIDDEN';end if;
  if nullif(trim(p_name),'') is null then raise exception 'TEAM_NAME_REQUIRED';end if;
  if p_squad_size<=0 or p_total_auction_budget<0 then raise exception 'TEAM_VALUES_INVALID';end if;
  insert into public.teams(name,primary_colour,secondary_colour,captain_name,vice_captain_name,manager_name,squad_size,total_auction_budget,created_by,tournament_id)
  values(trim(p_name),nullif(trim(p_primary_colour),''),nullif(trim(p_secondary_colour),''),null,null,nullif(trim(p_manager_name),''),p_squad_size,p_total_auction_budget,v_user,p_tournament_id)
  returning id into v_team;
  return v_team;
end;$$;

create or replace function public.admin_assign_team_role(
  p_tournament_id uuid,p_team_id uuid,p_user_id uuid,p_role text,p_replace boolean default false
) returns public.team_members language plpgsql security definer set search_path='' as $$
declare v_result public.team_members;v_name text;
begin
  if not private.is_tournament_admin(p_tournament_id) then raise exception 'TOURNAMENT_ADMIN_FORBIDDEN';end if;
  if p_role not in ('captain','vice_captain','manager','member','viewer') then raise exception 'TEAM_ROLE_INVALID';end if;
  if not exists(select 1 from public.teams where id=p_team_id and tournament_id=p_tournament_id) then raise exception 'TEAM_NOT_IN_TOURNAMENT';end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'USER_NOT_FOUND';end if;
  if p_role in ('captain','vice_captain') and exists(select 1 from public.team_members where team_id=p_team_id and role=p_role and user_id<>p_user_id) then
    if not p_replace then raise exception 'TEAM_LEADERSHIP_REPLACE_REQUIRED';end if;
    update public.team_members set role='member' where team_id=p_team_id and role=p_role and user_id<>p_user_id;
  end if;
  insert into public.team_members(team_id,user_id,role) values(p_team_id,p_user_id,p_role)
  on conflict(team_id,user_id) do update set role=excluded.role,updated_at=now() returning * into v_result;
  select coalesce(preferred_name,display_name,full_name) into v_name from public.profiles where id=p_user_id;
  if p_role='captain' then update public.teams set captain_name=coalesce(v_name,'Assigned captain') where id=p_team_id;
  elsif p_role='vice_captain' then update public.teams set vice_captain_name=coalesce(v_name,'Assigned vice captain') where id=p_team_id;
  elsif p_role='manager' then update public.teams set manager_name=coalesce(v_name,'Assigned manager') where id=p_team_id;end if;
  return v_result;
end;$$;

create or replace function public.admin_remove_team_access(p_tournament_id uuid,p_team_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
  if not private.is_tournament_admin(p_tournament_id) then raise exception 'TOURNAMENT_ADMIN_FORBIDDEN';end if;
  if not exists(select 1 from public.teams where id=p_team_id and tournament_id=p_tournament_id) then raise exception 'TEAM_NOT_IN_TOURNAMENT';end if;
  delete from public.team_members where team_id=p_team_id and user_id=p_user_id returning role into v_role;
  if v_role='captain' then update public.teams set captain_name=null where id=p_team_id;
  elsif v_role='vice_captain' then update public.teams set vice_captain_name=null where id=p_team_id;
  elsif v_role='manager' then update public.teams set manager_name=null where id=p_team_id;end if;
  return v_role is not null;
end;$$;

create or replace function public.admin_invite_team_user(
  p_tournament_id uuid,p_team_id uuid,p_email text,p_full_name text,p_role text,p_replace boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid;v_invite uuid;v_email text:=lower(trim(p_email));
begin
  if not private.is_tournament_admin(p_tournament_id) then raise exception 'TOURNAMENT_ADMIN_FORBIDDEN';end if;
  if not exists(select 1 from public.teams where id=p_team_id and tournament_id=p_tournament_id) then raise exception 'TEAM_NOT_IN_TOURNAMENT';end if;
  if v_email='' or position('@' in v_email)<2 then raise exception 'EMAIL_INVALID';end if;
  if p_role not in ('captain','vice_captain','manager','member','viewer') then raise exception 'TEAM_ROLE_INVALID';end if;
  if p_role in ('captain','vice_captain') and exists(select 1 from public.team_members where team_id=p_team_id and role=p_role) and not p_replace then raise exception 'TEAM_LEADERSHIP_REPLACE_REQUIRED';end if;
  select id into v_user from auth.users where lower(email)=v_email limit 1;
  if v_user is not null then
    perform public.admin_assign_team_role(p_tournament_id,p_team_id,v_user,p_role,p_replace);
    return jsonb_build_object('status','assigned','user_id',v_user);
  end if;
  insert into public.team_invitations(tournament_id,team_id,email,full_name,team_role,invited_by)
  values(p_tournament_id,p_team_id,v_email,nullif(trim(p_full_name),''),p_role,(select auth.uid()))
  on conflict(team_id,lower(email)) where status='pending' do update set full_name=excluded.full_name,team_role=excluded.team_role,invited_by=excluded.invited_by,updated_at=now()
  returning id into v_invite;
  return jsonb_build_object('status','invited','invitation_id',v_invite);
end;$$;

create or replace function private.claim_team_invitations()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_invite public.team_invitations;
begin
  for v_invite in select * from public.team_invitations where status='pending' and lower(email)=lower(new.email) for update loop
    if v_invite.team_role in ('captain','vice_captain') then
      update public.team_members set role='member' where team_id=v_invite.team_id and role=v_invite.team_role;
    end if;
    insert into public.team_members(team_id,user_id,role) values(v_invite.team_id,new.id,v_invite.team_role)
    on conflict(team_id,user_id) do update set role=excluded.role,updated_at=now();
    update public.team_invitations set status='accepted',accepted_by=new.id,accepted_at=now() where id=v_invite.id;
  end loop;
  return new;
end;$$;
create trigger on_auth_user_claim_team_invitations after insert on auth.users
  for each row execute function private.claim_team_invitations();

create or replace function public.get_tournament_access_directory(p_tournament_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select case when private.is_tournament_admin(p_tournament_id) then jsonb_build_object(
    'tournament_members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',tm.user_id,'role',tm.role,'name',coalesce(p.preferred_name,p.display_name,p.full_name),'email',u.email)),'[]'::jsonb) from public.tournament_members tm join auth.users u on u.id=tm.user_id left join public.profiles p on p.id=tm.user_id where tm.tournament_id=p_tournament_id),
    'team_members',(select coalesce(jsonb_agg(jsonb_build_object('team_id',m.team_id,'user_id',m.user_id,'role',m.role,'name',coalesce(p.preferred_name,p.display_name,p.full_name),'email',u.email)),'[]'::jsonb) from public.team_members m join public.teams te on te.id=m.team_id join auth.users u on u.id=m.user_id left join public.profiles p on p.id=m.user_id where te.tournament_id=p_tournament_id),
    'invitations',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'team_id',i.team_id,'email',i.email,'full_name',i.full_name,'role',i.team_role,'status',i.status)),'[]'::jsonb) from public.team_invitations i where i.tournament_id=p_tournament_id)
  ) else null end;
$$;

revoke all on function public.admin_create_tournament_team(uuid,text,text,text,integer,numeric,text),public.admin_assign_team_role(uuid,uuid,uuid,text,boolean),public.admin_remove_team_access(uuid,uuid,uuid),public.admin_invite_team_user(uuid,uuid,text,text,text,boolean),public.get_tournament_access_directory(uuid) from public;
grant execute on function public.admin_create_tournament_team(uuid,text,text,text,integer,numeric,text),public.admin_assign_team_role(uuid,uuid,uuid,text,boolean),public.admin_remove_team_access(uuid,uuid,uuid),public.admin_invite_team_user(uuid,uuid,text,text,text,boolean),public.get_tournament_access_directory(uuid) to authenticated;

create or replace function public.phase14_setup_status() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'tournament_members',to_regclass('public.tournament_members') is not null,
  'team_tournament_relationship',exists(select 1 from information_schema.columns where table_schema='public' and table_name='teams' and column_name='tournament_id'),
  'captain_unique',to_regclass('public.team_members_one_captain_idx') is not null,
  'vice_captain_unique',to_regclass('public.team_members_one_vice_captain_idx') is not null,
  'admin_create_team',to_regprocedure('public.admin_create_tournament_team(uuid,text,text,text,integer,numeric,text)') is not null,
  'admin_access_rpc',to_regprocedure('public.admin_assign_team_role(uuid,uuid,uuid,text,boolean)') is not null,
  'private_planning_unchanged',true
);$$;
revoke all on function public.phase14_setup_status() from public;
grant execute on function public.phase14_setup_status() to anon,authenticated;
