-- Squad Planner Phase 15: platform administration and multi-tournament access.
-- Apply manually after 009_tournament_admin_access.sql. Never edit an applied migration.

create table public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_roles_user_role_key unique(user_id,role)
);
create index platform_roles_user_id_idx on public.platform_roles(user_id);
create trigger platform_roles_set_updated_at before update on public.platform_roles
  for each row execute function private.set_updated_at();

alter table public.tournaments alter column team_id drop not null;
alter table public.tournaments add column status text not null default 'draft';
alter table public.tournaments add constraint tournaments_status_check
  check (status in ('draft','setup','active','completed','archived'));
update public.tournaments set status=case when is_active then 'active' else 'completed' end;
create index tournaments_status_dates_idx on public.tournaments(status,start_date,end_date);

create table public.tournament_invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  email text not null,
  full_name text,
  tournament_role text not null check (tournament_role in ('tournament_admin','tournament_viewer')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','cancelled')),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index tournament_invitations_pending_email_idx
  on public.tournament_invitations(tournament_id,lower(email)) where status='pending';
create index tournament_invitations_email_idx on public.tournament_invitations(lower(email),status);
create trigger tournament_invitations_set_updated_at before update on public.tournament_invitations
  for each row execute function private.set_updated_at();

-- SECURITY DEFINER prevents platform_roles RLS recursion. It returns only a boolean.
create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.platform_roles where user_id=(select auth.uid()) and role='super_admin');
$$;
revoke all on function private.is_super_admin() from public;
grant execute on function private.is_super_admin() to authenticated;

-- Platform admins may open tournament administration, but this helper is only used
-- by tournament/team setup policies. Private player and planning policies still use
-- explicit team membership helpers and are intentionally untouched.
create or replace function private.is_tournament_admin(requested_tournament_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_super_admin() or exists(
    select 1 from public.tournament_members
    where tournament_id=requested_tournament_id and user_id=(select auth.uid()) and role='tournament_admin'
  );
$$;

alter table public.platform_roles enable row level security;
alter table public.tournament_invitations enable row level security;

create policy "Users read own platform roles" on public.platform_roles for select to authenticated
  using (user_id=(select auth.uid()) or (select private.is_super_admin()));
create policy "Super admins manage platform roles" on public.platform_roles for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "Super admins manage tournaments" on public.tournaments for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "Super admins read tournament teams" on public.teams for select to authenticated
  using ((select private.is_super_admin()));
create policy "Super admins read tournament access" on public.tournament_members for select to authenticated
  using ((select private.is_super_admin()));
create policy "Super admins manage tournament access" on public.tournament_members for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "Super admins read team setup access" on public.team_members for select to authenticated
  using ((select private.is_super_admin()));
create policy "Super admins manage tournament invitations" on public.tournament_invitations for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "Tournament admins read tournament invitations" on public.tournament_invitations for select to authenticated
  using ((select private.is_tournament_admin(tournament_id)));

grant select,insert,update,delete on public.platform_roles,public.tournament_invitations to authenticated;

create or replace function public.super_admin_create_tournament(
  p_name text,p_start_date date,p_end_date date default null,p_location text default null,
  p_notes text default null,p_status text default 'draft'
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if not private.is_super_admin() then raise exception 'SUPER_ADMIN_FORBIDDEN'; end if;
  if nullif(trim(p_name),'') is null or p_start_date is null then raise exception 'TOURNAMENT_VALUES_INVALID'; end if;
  if p_end_date is not null and p_end_date<p_start_date then raise exception 'TOURNAMENT_DATES_INVALID'; end if;
  if p_status not in ('draft','setup','active','completed','archived') then raise exception 'TOURNAMENT_STATUS_INVALID'; end if;
  insert into public.tournaments(team_id,name,start_date,end_date,location,notes,status,is_active)
  values(null,trim(p_name),p_start_date,p_end_date,nullif(trim(p_location),''),nullif(trim(p_notes),''),p_status,p_status='active')
  returning id into v_id;
  return v_id;
end;$$;

create or replace function public.super_admin_update_tournament(
  p_tournament_id uuid,p_name text,p_start_date date,p_end_date date,p_location text,p_notes text,p_status text
) returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not private.is_super_admin() then raise exception 'SUPER_ADMIN_FORBIDDEN'; end if;
  if nullif(trim(p_name),'') is null or p_start_date is null or (p_end_date is not null and p_end_date<p_start_date) then raise exception 'TOURNAMENT_VALUES_INVALID'; end if;
  if p_status not in ('draft','setup','active','completed','archived') then raise exception 'TOURNAMENT_STATUS_INVALID'; end if;
  update public.tournaments set name=trim(p_name),start_date=p_start_date,end_date=p_end_date,
    location=nullif(trim(p_location),''),notes=nullif(trim(p_notes),''),status=p_status,is_active=p_status='active'
  where id=p_tournament_id;
  return found;
end;$$;

create or replace function public.super_admin_assign_tournament_role(
  p_tournament_id uuid,p_user_id uuid,p_role text
) returns public.tournament_members language plpgsql security definer set search_path='' as $$
declare v_result public.tournament_members;
begin
  if not private.is_super_admin() then raise exception 'SUPER_ADMIN_FORBIDDEN'; end if;
  if p_role not in ('tournament_admin','tournament_viewer') then raise exception 'TOURNAMENT_ROLE_INVALID'; end if;
  if not exists(select 1 from public.tournaments where id=p_tournament_id) then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'USER_NOT_FOUND'; end if;
  insert into public.tournament_members(tournament_id,user_id,role) values(p_tournament_id,p_user_id,p_role)
  on conflict(tournament_id,user_id) do update set role=excluded.role,updated_at=now() returning * into v_result;
  return v_result;
end;$$;

create or replace function public.super_admin_remove_tournament_access(p_tournament_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not private.is_super_admin() then raise exception 'SUPER_ADMIN_FORBIDDEN'; end if;
  delete from public.tournament_members where tournament_id=p_tournament_id and user_id=p_user_id;
  return found;
end;$$;

create or replace function public.super_admin_invite_tournament_user(
  p_tournament_id uuid,p_email text,p_full_name text,p_role text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid;v_invite uuid;v_email text:=lower(trim(p_email));
begin
  if not private.is_super_admin() then raise exception 'SUPER_ADMIN_FORBIDDEN'; end if;
  if p_role not in ('tournament_admin','tournament_viewer') or position('@' in v_email)<2 then raise exception 'INVITATION_VALUES_INVALID'; end if;
  if not exists(select 1 from public.tournaments where id=p_tournament_id) then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  select id into v_user from auth.users where lower(email)=v_email limit 1;
  if v_user is not null then
    perform public.super_admin_assign_tournament_role(p_tournament_id,v_user,p_role);
    return jsonb_build_object('status','assigned','user_id',v_user);
  end if;
  insert into public.tournament_invitations(tournament_id,email,full_name,tournament_role,invited_by)
  values(p_tournament_id,v_email,nullif(trim(p_full_name),''),p_role,(select auth.uid()))
  on conflict(tournament_id,lower(email)) where status='pending' do update
    set full_name=excluded.full_name,tournament_role=excluded.tournament_role,invited_by=excluded.invited_by,updated_at=now()
  returning id into v_invite;
  return jsonb_build_object('status','invited','invitation_id',v_invite);
end;$$;

create or replace function private.claim_tournament_invitations()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_invite public.tournament_invitations;
begin
  for v_invite in select * from public.tournament_invitations where status='pending' and lower(email)=lower(new.email) for update loop
    insert into public.tournament_members(tournament_id,user_id,role)
    values(v_invite.tournament_id,new.id,v_invite.tournament_role)
    on conflict(tournament_id,user_id) do update set role=excluded.role,updated_at=now();
    update public.tournament_invitations set status='accepted',accepted_by=new.id,accepted_at=now() where id=v_invite.id;
  end loop;
  return new;
end;$$;
create trigger on_auth_user_claim_tournament_invitations after insert on auth.users
  for each row execute function private.claim_tournament_invitations();

create or replace function public.get_platform_admin_directory()
returns jsonb language sql stable security definer set search_path='' as $$
select case when private.is_super_admin() then jsonb_build_object(
  'platform_admins',(select coalesce(jsonb_agg(jsonb_build_object('user_id',r.user_id,'role',r.role,'name',coalesce(p.preferred_name,p.display_name,p.full_name),'email',u.email)),'[]'::jsonb) from public.platform_roles r join auth.users u on u.id=r.user_id left join public.profiles p on p.id=r.user_id),
  'tournament_members',(select coalesce(jsonb_agg(jsonb_build_object('tournament_id',m.tournament_id,'user_id',m.user_id,'role',m.role,'name',coalesce(p.preferred_name,p.display_name,p.full_name),'email',u.email)),'[]'::jsonb) from public.tournament_members m join auth.users u on u.id=m.user_id left join public.profiles p on p.id=m.user_id),
  'invitations',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'tournament_id',i.tournament_id,'email',i.email,'full_name',i.full_name,'role',i.tournament_role,'status',i.status)),'[]'::jsonb) from public.tournament_invitations i)
) else null end;
$$;

revoke all on function public.super_admin_create_tournament(text,date,date,text,text,text),public.super_admin_update_tournament(uuid,text,date,date,text,text,text),public.super_admin_assign_tournament_role(uuid,uuid,text),public.super_admin_remove_tournament_access(uuid,uuid),public.super_admin_invite_tournament_user(uuid,text,text,text),public.get_platform_admin_directory() from public;
grant execute on function public.super_admin_create_tournament(text,date,date,text,text,text),public.super_admin_update_tournament(uuid,text,date,date,text,text,text),public.super_admin_assign_tournament_role(uuid,uuid,text),public.super_admin_remove_tournament_access(uuid,uuid),public.super_admin_invite_tournament_user(uuid,text,text,text),public.get_platform_admin_directory() to authenticated;

create or replace function public.phase15_setup_status() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'platform_roles',to_regclass('public.platform_roles') is not null,
  'super_admin_helper',to_regprocedure('private.is_super_admin()') is not null,
  'tournament_lifecycle',exists(select 1 from information_schema.columns where table_schema='public' and table_name='tournaments' and column_name='status'),
  'multi_tournament_admins',to_regclass('public.tournament_members') is not null,
  'tournament_invitations',to_regclass('public.tournament_invitations') is not null,
  'private_team_strategy_unchanged',true
);$$;
revoke all on function public.phase15_setup_status() from public;
grant execute on function public.phase15_setup_status() to anon,authenticated;
