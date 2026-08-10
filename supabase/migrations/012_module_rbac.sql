-- Squad Planner Phase 17: module-level scoped RBAC.
-- Apply manually after 011_registration_live_auction.sql.

create table public.app_modules(
  id uuid primary key default gen_random_uuid(),
  key text not null unique check(key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  scope text not null check(scope in('platform','tournament','team')),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.permission_actions(
  id uuid primary key default gen_random_uuid(),
  key text not null unique check(key ~ '^[a-z][a-z0-9_]*$'),
  name text not null
);

create table public.module_permission_actions(
  module_id uuid not null references public.app_modules(id) on delete cascade,
  action_id uuid not null references public.permission_actions(id) on delete cascade,
  primary key(module_id,action_id)
);

create table public.role_permissions(
  id uuid primary key default gen_random_uuid(),
  role_scope text not null check(role_scope in('platform','tournament','team')),
  role_key text not null,
  config_scope_type text not null default 'global' check(config_scope_type in('global','tournament')),
  scope_id uuid,
  module_id uuid not null references public.app_modules(id) on delete cascade,
  action_id uuid not null references public.permission_actions(id) on delete cascade,
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((config_scope_type='global' and scope_id is null) or (config_scope_type='tournament' and scope_id is not null))
);
create unique index role_permissions_identity_idx on public.role_permissions(role_scope,role_key,config_scope_type,coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid),module_id,action_id);

create table public.user_permission_overrides(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope_type text not null check(scope_type in('platform','tournament','team')),
  scope_id uuid,
  module_id uuid not null references public.app_modules(id) on delete cascade,
  action_id uuid not null references public.permission_actions(id) on delete cascade,
  effect text not null check(effect in('allow','deny')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((scope_type='platform' and scope_id is null) or (scope_type in('tournament','team') and scope_id is not null))
);
create unique index user_permission_override_identity_idx on public.user_permission_overrides(user_id,scope_type,coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid),module_id,action_id);

create table public.permission_audit_log(
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check(event_type in('role_permission_changed','role_permissions_reset','user_override_changed','user_overrides_reset')),
  role_scope text,
  role_key text,
  scope_type text not null check(scope_type in('platform','tournament','team')),
  scope_id uuid,
  module_key text,
  action_key text,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index role_permissions_lookup_idx on public.role_permissions(role_scope,role_key,config_scope_type,scope_id,module_id,action_id,allowed);
create index user_permission_overrides_lookup_idx on public.user_permission_overrides(user_id,scope_type,scope_id,module_id,action_id,effect);
create index permission_audit_scope_idx on public.permission_audit_log(scope_type,scope_id,created_at desc);

create trigger role_permissions_updated before update on public.role_permissions for each row execute function private.set_updated_at();
create trigger user_permission_overrides_updated before update on public.user_permission_overrides for each row execute function private.set_updated_at();

insert into public.permission_actions(key,name) values
 ('view','View'),('create','Create'),('edit','Edit'),('delete','Delete'),('manage','Manage'),('export','Export'),('import','Import'),('bid','Bid'),('manage_members','Manage Members');

insert into public.app_modules(key,name,scope,description,sort_order) values
 ('admin_dashboard','Admin Dashboard','platform','Platform administration summary',10),
 ('tournaments','Tournaments','platform','Create and manage tournaments',20),
 ('platform_users','Platform Users','platform','Platform users and administrative access',30),
 ('tournament_overview','Tournament Overview','tournament','Tournament administration summary',100),
 ('registration','Registration','tournament','Public tournament registration',110),
 ('player_pool','Player Pool','tournament','Tournament-wide registered player pool',120),
 ('teams','Teams','tournament','Tournament team setup',130),
 ('tournament_users','Tournament Users','tournament','Tournament and team access',140),
 ('auction_setup','Auction Setup','tournament','Auction schedule and bucket configuration',150),
 ('auction_control','Auction Control Room','tournament','Run the central live auction',160),
 ('fixtures','Fixtures','tournament','Tournament fixture administration',170),
 ('availability','Availability','tournament','Tournament availability administration',180),
 ('tournament_reports','Tournament Reports','tournament','Tournament-level reporting',190),
 ('team_dashboard','Team Dashboard','team','Team workspace summary',200),
 ('team_players','Players','team','Team player management',210),
 ('team_buckets','Buckets','team','Private team auction buckets',220),
 ('team_planning','Planning','team','Private Plan A, B and C strategy',230),
 ('team_auction','Auction','team','Team live auction and bidding',240),
 ('team_squad','Squad','team','Live and final squad',250),
 ('team_matches','Matches / Tournament','team','Fixtures, squads and results',260),
 ('team_opportunities','Opportunities','team','Player opportunity tracking',270),
 ('team_duties','Volunteer Duties','team','Volunteer duty coordination',280),
 ('team_reports','Reports','team','Team reporting',290),
 ('team_settings','Team Settings','team','Team setup and branding',300);

insert into public.module_permission_actions(module_id,action_id)
select m.id,a.id from public.app_modules m cross join public.permission_actions a where
 (m.key in('admin_dashboard','tournament_overview','team_dashboard','team_squad','team_opportunities') and a.key='view') or
 (m.key in('tournaments','platform_users','tournament_users','teams') and a.key in('view','create','edit','delete','manage','manage_members')) or
 (m.key in('registration','auction_setup','auction_control','fixtures','availability','team_buckets','team_planning','team_matches','team_duties') and a.key in('view','manage')) or
 (m.key in('player_pool','team_players') and a.key in('view','create','edit','delete','export','import')) or
 (m.key='team_auction' and a.key in('view','manage','bid')) or
 (m.key in('tournament_reports','team_reports') and a.key in('view','export')) or
 (m.key='team_settings' and a.key in('view','edit'));

-- Global system defaults. A tournament-specific row overrides the matching global role row.
insert into public.role_permissions(role_scope,role_key,module_id,action_id,allowed)
select 'platform','super_admin',m.id,a.id,true from public.app_modules m cross join public.permission_actions a
where m.scope in('platform','tournament') and ((m.scope='platform' and a.key in('view','create','edit','delete','manage','export','manage_members')) or (m.scope='tournament' and a.key in('view','create','edit','delete','manage','export','import','manage_members')));

insert into public.role_permissions(role_scope,role_key,module_id,action_id,allowed)
select 'tournament','tournament_admin',m.id,a.id,true from public.app_modules m cross join public.permission_actions a
where m.scope='tournament' and a.key in('view','create','edit','delete','manage','export','import','manage_members');
insert into public.role_permissions(role_scope,role_key,module_id,action_id,allowed)
select 'tournament','tournament_viewer',m.id,a.id,true from public.app_modules m join public.permission_actions a on a.key='view' where m.scope='tournament';

insert into public.role_permissions(role_scope,role_key,module_id,action_id,allowed)
select 'team',r.role_key,m.id,a.id,true
from (values('owner'),('captain'),('vice_captain')) r(role_key)
cross join public.app_modules m cross join public.permission_actions a
where m.scope='team' and a.key in('view','create','edit','delete','manage','export','import','bid','manage_members');

insert into public.role_permissions(role_scope,role_key,module_id,action_id,allowed)
select 'team','manager',m.id,a.id,true from public.app_modules m cross join public.permission_actions a
where m.scope='team' and ((m.key in('team_dashboard','team_players','team_buckets','team_planning','team_squad','team_matches','team_opportunities','team_duties') and a.key in('view','create','edit','manage','import')) or (m.key='team_reports' and a.key='view') or (m.key='team_auction' and a.key='view'));
insert into public.role_permissions(role_scope,role_key,module_id,action_id,allowed)
select 'team','member',m.id,a.id,true from public.app_modules m join public.permission_actions a on a.key='view' where m.key in('team_dashboard','team_squad','team_matches','team_opportunities','team_duties','team_reports','team_auction');
insert into public.role_permissions(role_scope,role_key,module_id,action_id,allowed)
select 'team','viewer',m.id,a.id,true from public.app_modules m join public.permission_actions a on a.key='view' where m.key in('team_dashboard','team_squad','team_matches','team_reports','team_auction');

create or replace function private.permission_scope_tournament(p_scope_type text,p_scope_id uuid)
returns uuid language sql stable security definer set search_path='' as $$
 select case when p_scope_type='tournament' then p_scope_id when p_scope_type='team' then (select tournament_id from public.teams where id=p_scope_id) else null end;
$$;

create or replace function private.has_permission(p_user_id uuid,p_module_key text,p_action_key text,p_scope_type text,p_scope_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_module public.app_modules;v_action_id uuid;v_tournament_id uuid;v_allowed boolean:=false;
begin
 if p_user_id is null or p_scope_type not in('platform','tournament','team') then return false;end if;
 select * into v_module from public.app_modules where key=p_module_key and scope=p_scope_type and is_active;
 select id into v_action_id from public.permission_actions where key=p_action_key;
 if not found or v_module.id is null then return false;end if;
 if not exists(select 1 from public.module_permission_actions where module_id=v_module.id and action_id=v_action_id) then return false;end if;
 if p_scope_type='platform' and p_scope_id is not null then return false;end if;
 if p_scope_type<>'platform' and p_scope_id is null then return false;end if;
 -- An override never creates membership. It only adjusts permissions inside an
 -- access scope the user already belongs to. This also makes stale overrides
 -- harmless after tournament/team access is removed.
 if p_scope_type='platform' and not exists(select 1 from public.platform_roles where user_id=p_user_id) then return false;end if;
 if p_scope_type='tournament'
    and not exists(select 1 from public.platform_roles where user_id=p_user_id and role='super_admin')
    and not exists(select 1 from public.tournament_members where tournament_id=p_scope_id and user_id=p_user_id)
 then return false;end if;
 if p_scope_type='team'
    and not exists(select 1 from public.team_members where team_id=p_scope_id and user_id=p_user_id)
 then return false;end if;
 if exists(select 1 from public.user_permission_overrides u where u.user_id=p_user_id and u.scope_type=p_scope_type and u.scope_id is not distinct from p_scope_id and u.module_id=v_module.id and u.action_id=v_action_id and u.effect='deny') then return false;end if;
 if exists(select 1 from public.user_permission_overrides u where u.user_id=p_user_id and u.scope_type=p_scope_type and u.scope_id is not distinct from p_scope_id and u.module_id=v_module.id and u.action_id=v_action_id and u.effect='allow') then return true;end if;
 v_tournament_id=private.permission_scope_tournament(p_scope_type,p_scope_id);
 with roles as(
  select 'platform'::text role_scope,pr.role::text role_key from public.platform_roles pr where pr.user_id=p_user_id
  union all select 'tournament',tm.role from public.tournament_members tm where tm.user_id=p_user_id and tm.tournament_id=p_scope_id and p_scope_type='tournament'
  union all select 'team',mem.role from public.team_members mem where mem.user_id=p_user_id and mem.team_id=p_scope_id and p_scope_type='team'
 ), resolved as(
  select r.role_scope,r.role_key,coalesce(scoped.allowed,global_permission.allowed,false) allowed
  from roles r
  left join public.role_permissions scoped on scoped.role_scope=r.role_scope and scoped.role_key=r.role_key and scoped.config_scope_type='tournament' and scoped.scope_id=v_tournament_id and scoped.module_id=v_module.id and scoped.action_id=v_action_id
  left join public.role_permissions global_permission on global_permission.role_scope=r.role_scope and global_permission.role_key=r.role_key and global_permission.config_scope_type='global' and global_permission.module_id=v_module.id and global_permission.action_id=v_action_id
 ) select coalesce(bool_or(allowed),false) into v_allowed from resolved;
 return v_allowed;
end;$$;

create or replace function public.current_user_has_permission(p_module_key text,p_action_key text,p_scope_type text,p_scope_id uuid default null)
returns boolean language sql stable security definer set search_path='' as $$select private.has_permission((select auth.uid()),p_module_key,p_action_key,p_scope_type,p_scope_id)$$;

create or replace function public.get_effective_permissions(p_scope_type text,p_scope_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(m.key,actions.permissions),'{}'::jsonb)
 from public.app_modules m cross join lateral(
  select jsonb_object_agg(a.key,private.has_permission((select auth.uid()),m.key,a.key,p_scope_type,p_scope_id)) permissions from public.permission_actions a join public.module_permission_actions ma on ma.action_id=a.id and ma.module_id=m.id
 ) actions where m.scope=p_scope_type and m.is_active;
$$;

revoke all on function private.permission_scope_tournament(text,uuid),private.has_permission(uuid,text,text,text,uuid) from public;
grant execute on function public.current_user_has_permission(text,text,text,uuid),public.get_effective_permissions(text,uuid) to authenticated;

create or replace function private.can_manage_permission_scope(p_scope_type text,p_scope_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select case when private.is_super_admin() then true when p_scope_type='tournament' then private.is_tournament_admin(p_scope_id)
 when p_scope_type='team' then private.is_tournament_admin_for_team(p_scope_id) else false end;
$$;
revoke all on function private.can_manage_permission_scope(text,uuid) from public;

create or replace function public.set_role_permissions(
 p_role_scope text,p_role_key text,p_config_scope_type text,p_scope_id uuid,p_permissions jsonb
) returns integer language plpgsql security definer set search_path='' as $$
declare item jsonb;v_module public.app_modules;v_action public.permission_actions;v_previous boolean;v_count integer:=0;v_manage_scope text;v_manage_id uuid;
begin
 if p_config_scope_type='global' then
   if not private.is_super_admin() then raise exception 'PERMISSION_ADMIN_FORBIDDEN';end if;
   if p_scope_id is not null then raise exception 'INVALID_PERMISSION_SCOPE';end if;
 else
   if p_config_scope_type<>'tournament' or p_scope_id is null or not private.can_manage_permission_scope('tournament',p_scope_id) then raise exception 'PERMISSION_ADMIN_FORBIDDEN';end if;
 end if;
 if p_role_scope='platform' and (p_role_key<>'super_admin' or not private.is_super_admin()) then raise exception 'PLATFORM_ROLE_FORBIDDEN';end if;
 if p_role_scope='tournament' and p_role_key not in('tournament_admin','tournament_viewer') then raise exception 'INVALID_ROLE';end if;
 if p_role_scope='team' and p_role_key not in('owner','captain','vice_captain','manager','member','viewer') then raise exception 'INVALID_ROLE';end if;
 if jsonb_typeof(p_permissions)<>'array' then raise exception 'INVALID_PERMISSIONS';end if;
 for item in select value from jsonb_array_elements(p_permissions) loop
   select * into v_module from public.app_modules where key=item->>'module';select * into v_action from public.permission_actions where key=item->>'action';
   if v_module.id is null or v_action.id is null or v_module.scope<>p_role_scope then raise exception 'INVALID_PERMISSION_ENTRY';end if;
   select allowed into v_previous from public.role_permissions where role_scope=p_role_scope and role_key=p_role_key and config_scope_type=p_config_scope_type and scope_id is not distinct from p_scope_id and module_id=v_module.id and action_id=v_action.id;
   insert into public.role_permissions(role_scope,role_key,config_scope_type,scope_id,module_id,action_id,allowed)
   values(p_role_scope,p_role_key,p_config_scope_type,p_scope_id,v_module.id,v_action.id,coalesce((item->>'allowed')::boolean,false))
   on conflict(role_scope,role_key,config_scope_type,(coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid)),module_id,action_id)
   do update set allowed=excluded.allowed,updated_at=now();
   insert into public.permission_audit_log(actor_user_id,event_type,role_scope,role_key,scope_type,scope_id,module_key,action_key,previous_value,new_value)
   values((select auth.uid()),'role_permission_changed',p_role_scope,p_role_key,case when p_config_scope_type='global' then 'platform' else 'tournament' end,p_scope_id,v_module.key,v_action.key,to_jsonb(v_previous),to_jsonb(coalesce((item->>'allowed')::boolean,false)));
   v_count=v_count+1;
 end loop;return v_count;
end;$$;

create or replace function public.reset_role_permissions(p_role_scope text,p_role_key text,p_tournament_id uuid)
returns integer language plpgsql security definer set search_path='' as $$declare v_count integer;
begin
 if p_tournament_id is null or not private.can_manage_permission_scope('tournament',p_tournament_id) then raise exception 'PERMISSION_ADMIN_FORBIDDEN';end if;
 delete from public.role_permissions where role_scope=p_role_scope and role_key=p_role_key and config_scope_type='tournament' and scope_id=p_tournament_id;get diagnostics v_count=row_count;
 insert into public.permission_audit_log(actor_user_id,event_type,role_scope,role_key,scope_type,scope_id,new_value) values((select auth.uid()),'role_permissions_reset',p_role_scope,p_role_key,'tournament',p_tournament_id,jsonb_build_object('deleted',v_count));return v_count;
end;$$;

create or replace function public.set_user_permission_override(p_user_id uuid,p_scope_type text,p_scope_id uuid,p_module_key text,p_action_key text,p_effect text)
returns public.user_permission_overrides language plpgsql security definer set search_path='' as $$
declare v_module public.app_modules;v_action public.permission_actions;v_row public.user_permission_overrides;v_previous text;
begin
 if not private.can_manage_permission_scope(p_scope_type,p_scope_id) then raise exception 'PERMISSION_ADMIN_FORBIDDEN';end if;
 if p_effect not in('allow','deny') then raise exception 'INVALID_EFFECT';end if;
 select * into v_module from public.app_modules where key=p_module_key and scope=p_scope_type;select * into v_action from public.permission_actions where key=p_action_key;
 if v_module.id is null or v_action.id is null then raise exception 'INVALID_PERMISSION_ENTRY';end if;
 if p_scope_type='tournament' and not exists(select 1 from public.tournament_members where tournament_id=p_scope_id and user_id=p_user_id) then raise exception 'USER_OUTSIDE_SCOPE';end if;
 if p_scope_type='team' and not exists(select 1 from public.team_members where team_id=p_scope_id and user_id=p_user_id) then raise exception 'USER_OUTSIDE_SCOPE';end if;
 select effect into v_previous from public.user_permission_overrides where user_id=p_user_id and scope_type=p_scope_type and scope_id is not distinct from p_scope_id and module_id=v_module.id and action_id=v_action.id;
 insert into public.user_permission_overrides(user_id,scope_type,scope_id,module_id,action_id,effect,created_by)
 values(p_user_id,p_scope_type,p_scope_id,v_module.id,v_action.id,p_effect,(select auth.uid()))
 on conflict(user_id,scope_type,(coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid)),module_id,action_id)
 do update set effect=excluded.effect,created_by=excluded.created_by,updated_at=now() returning * into v_row;
 insert into public.permission_audit_log(actor_user_id,target_user_id,event_type,scope_type,scope_id,module_key,action_key,previous_value,new_value) values((select auth.uid()),p_user_id,'user_override_changed',p_scope_type,p_scope_id,p_module_key,p_action_key,to_jsonb(v_previous),to_jsonb(p_effect));return v_row;
end;$$;

create or replace function public.clear_user_permission_overrides(p_user_id uuid,p_scope_type text,p_scope_id uuid)
returns integer language plpgsql security definer set search_path='' as $$declare v_count integer;
begin
 if not private.can_manage_permission_scope(p_scope_type,p_scope_id) then raise exception 'PERMISSION_ADMIN_FORBIDDEN';end if;
 delete from public.user_permission_overrides where user_id=p_user_id and scope_type=p_scope_type and scope_id is not distinct from p_scope_id;get diagnostics v_count=row_count;
 insert into public.permission_audit_log(actor_user_id,target_user_id,event_type,scope_type,scope_id,new_value) values((select auth.uid()),p_user_id,'user_overrides_reset',p_scope_type,p_scope_id,jsonb_build_object('deleted',v_count));return v_count;
end;$$;

create or replace function public.get_role_permission_matrix(p_role_scope text,p_role_key text,p_tournament_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select case when (p_tournament_id is null and private.is_super_admin()) or (p_tournament_id is not null and private.can_manage_permission_scope('tournament',p_tournament_id)) then
 coalesce(jsonb_agg(jsonb_build_object('module',m.key,'module_name',m.name,'scope',m.scope,'sort_order',m.sort_order,'actions',actions.permissions) order by m.sort_order),'[]'::jsonb) else '[]'::jsonb end
 from public.app_modules m cross join lateral(
  select jsonb_agg(jsonb_build_object('action',a.key,'action_name',a.name,'allowed',coalesce(scoped.allowed,global_permission.allowed,false),'custom',scoped.id is not null) order by a.name) permissions
  from public.permission_actions a join public.module_permission_actions ma on ma.action_id=a.id and ma.module_id=m.id
  left join public.role_permissions scoped on scoped.role_scope=p_role_scope and scoped.role_key=p_role_key and scoped.config_scope_type='tournament' and scoped.scope_id=p_tournament_id and scoped.module_id=m.id and scoped.action_id=a.id
  left join public.role_permissions global_permission on global_permission.role_scope=p_role_scope and global_permission.role_key=p_role_key and global_permission.config_scope_type='global' and global_permission.module_id=m.id and global_permission.action_id=a.id
 ) actions where m.scope=p_role_scope and m.is_active;
$$;

create or replace function public.get_user_effective_permissions(p_user_id uuid,p_scope_type text,p_scope_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select case when private.can_manage_permission_scope(p_scope_type,p_scope_id) then
 coalesce(jsonb_agg(jsonb_build_object('module',m.key,'module_name',m.name,'sort_order',m.sort_order,'actions',actions.permissions) order by m.sort_order),'[]'::jsonb)
 else '[]'::jsonb end
 from public.app_modules m cross join lateral(
  select jsonb_agg(jsonb_build_object('action',a.key,'action_name',a.name,'allowed',private.has_permission(p_user_id,m.key,a.key,p_scope_type,p_scope_id),'override',o.effect) order by a.name) permissions
  from public.permission_actions a join public.module_permission_actions ma on ma.action_id=a.id and ma.module_id=m.id left join public.user_permission_overrides o on o.user_id=p_user_id and o.scope_type=p_scope_type and o.scope_id is not distinct from p_scope_id and o.module_id=m.id and o.action_id=a.id
 ) actions where m.scope=p_scope_type and m.is_active;
$$;

revoke all on function public.set_role_permissions(text,text,text,uuid,jsonb),public.reset_role_permissions(text,text,uuid),public.set_user_permission_override(uuid,text,uuid,text,text,text),public.clear_user_permission_overrides(uuid,text,uuid),public.get_role_permission_matrix(text,text,uuid) from public;
grant execute on function public.set_role_permissions(text,text,text,uuid,jsonb),public.reset_role_permissions(text,text,uuid),public.set_user_permission_override(uuid,text,uuid,text,text,text),public.clear_user_permission_overrides(uuid,text,uuid),public.get_role_permission_matrix(text,text,uuid) to authenticated;
grant execute on function public.get_user_effective_permissions(uuid,text,uuid) to authenticated;

alter table public.app_modules enable row level security;alter table public.permission_actions enable row level security;alter table public.module_permission_actions enable row level security;alter table public.role_permissions enable row level security;alter table public.user_permission_overrides enable row level security;alter table public.permission_audit_log enable row level security;
create policy "Authenticated users read modules" on public.app_modules for select to authenticated using(true);
create policy "Authenticated users read permission actions" on public.permission_actions for select to authenticated using(true);
create policy "Authenticated users read module actions" on public.module_permission_actions for select to authenticated using(true);
create policy "Authenticated users read role permissions" on public.role_permissions for select to authenticated using(true);
create policy "Users and permission admins read overrides" on public.user_permission_overrides for select to authenticated using(user_id=(select auth.uid()) or private.can_manage_permission_scope(scope_type,scope_id));
create policy "Permission admins read audit" on public.permission_audit_log for select to authenticated using(private.can_manage_permission_scope(scope_type,scope_id));

-- Restrictive policies make configurable denies authoritative alongside existing permissive team policies.
create policy "RBAC players read" on public.players as restrictive for select to authenticated using(public.current_user_has_permission('team_players','view','team',team_id));
create policy "RBAC players create" on public.players as restrictive for insert to authenticated with check(public.current_user_has_permission('team_players','create','team',team_id));
create policy "RBAC players edit" on public.players as restrictive for update to authenticated using(public.current_user_has_permission('team_players','edit','team',team_id)) with check(public.current_user_has_permission('team_players','edit','team',team_id));
create policy "RBAC players delete" on public.players as restrictive for delete to authenticated using(public.current_user_has_permission('team_players','delete','team',team_id));
create policy "RBAC players allow read" on public.players for select to authenticated using(public.current_user_has_permission('team_players','view','team',team_id));
create policy "RBAC players allow create" on public.players for insert to authenticated with check(public.current_user_has_permission('team_players','create','team',team_id));
create policy "RBAC players allow edit" on public.players for update to authenticated using(public.current_user_has_permission('team_players','edit','team',team_id)) with check(public.current_user_has_permission('team_players','edit','team',team_id));
create policy "RBAC players allow delete" on public.players for delete to authenticated using(public.current_user_has_permission('team_players','delete','team',team_id));
create policy "RBAC team buckets read" on public.auction_buckets as restrictive for select to authenticated using(public.current_user_has_permission('team_buckets','view','team',team_id));
create policy "RBAC team buckets create" on public.auction_buckets as restrictive for insert to authenticated with check(public.current_user_has_permission('team_buckets','manage','team',team_id));
create policy "RBAC team buckets edit" on public.auction_buckets as restrictive for update to authenticated using(public.current_user_has_permission('team_buckets','manage','team',team_id));
create policy "RBAC team buckets delete" on public.auction_buckets as restrictive for delete to authenticated using(public.current_user_has_permission('team_buckets','manage','team',team_id));
create policy "RBAC team buckets allow read" on public.auction_buckets for select to authenticated using(public.current_user_has_permission('team_buckets','view','team',team_id));
create policy "RBAC team buckets allow create" on public.auction_buckets for insert to authenticated with check(public.current_user_has_permission('team_buckets','manage','team',team_id));
create policy "RBAC team buckets allow edit" on public.auction_buckets for update to authenticated using(public.current_user_has_permission('team_buckets','manage','team',team_id)) with check(public.current_user_has_permission('team_buckets','manage','team',team_id));
create policy "RBAC team buckets allow delete" on public.auction_buckets for delete to authenticated using(public.current_user_has_permission('team_buckets','manage','team',team_id));
create policy "RBAC plans read" on public.probable_teams as restrictive for select to authenticated using(public.current_user_has_permission('team_planning','view','team',team_id));
create policy "RBAC plan players read" on public.probable_team_players as restrictive for select to authenticated using(public.current_user_has_permission('team_planning','view','team',team_id));
create policy "RBAC plans create" on public.probable_teams as restrictive for insert to authenticated with check(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plans edit" on public.probable_teams as restrictive for update to authenticated using(public.current_user_has_permission('team_planning','manage','team',team_id)) with check(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plans delete" on public.probable_teams as restrictive for delete to authenticated using(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plan players create" on public.probable_team_players as restrictive for insert to authenticated with check(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plan players edit" on public.probable_team_players as restrictive for update to authenticated using(public.current_user_has_permission('team_planning','manage','team',team_id)) with check(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plan players delete" on public.probable_team_players as restrictive for delete to authenticated using(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plans allow read" on public.probable_teams for select to authenticated using(public.current_user_has_permission('team_planning','view','team',team_id));
create policy "RBAC plans allow create" on public.probable_teams for insert to authenticated with check(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plans allow edit" on public.probable_teams for update to authenticated using(public.current_user_has_permission('team_planning','manage','team',team_id)) with check(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plans allow delete" on public.probable_teams for delete to authenticated using(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plan players allow read" on public.probable_team_players for select to authenticated using(public.current_user_has_permission('team_planning','view','team',team_id));
create policy "RBAC plan players allow create" on public.probable_team_players for insert to authenticated with check(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plan players allow edit" on public.probable_team_players for update to authenticated using(public.current_user_has_permission('team_planning','manage','team',team_id)) with check(public.current_user_has_permission('team_planning','manage','team',team_id));
create policy "RBAC plan players allow delete" on public.probable_team_players for delete to authenticated using(public.current_user_has_permission('team_planning','manage','team',team_id));

-- Security-definer auction functions from earlier phases are wrapped so direct
-- RPC callers cannot bypass a configurable deny.
revoke execute on function public.update_player_auction_status(uuid,uuid,text,text,numeric,boolean,boolean) from authenticated;
create or replace function public.rbac_update_player_auction_status(p_team_id uuid,p_player_id uuid,p_expected_status text,p_new_status text,p_sold_price numeric default 0,p_override_squad_limit boolean default false,p_override_bucket_max boolean default false)
returns public.players language plpgsql security definer set search_path='' as $$begin
 if not private.has_permission((select auth.uid()),'team_auction','manage','team',p_team_id) then raise exception 'PERMISSION_DENIED';end if;
 return public.update_player_auction_status(p_team_id,p_player_id,p_expected_status,p_new_status,p_sold_price,p_override_squad_limit,p_override_bucket_max);
end;$$;
grant execute on function public.rbac_update_player_auction_status(uuid,uuid,text,text,numeric,boolean,boolean) to authenticated;

revoke execute on function public.update_auction_lifecycle(uuid,text,text) from authenticated;
create or replace function public.rbac_update_auction_lifecycle(p_team_id uuid,p_expected_status text,p_new_status text)
returns text language plpgsql security definer set search_path='' as $$begin
 if not private.has_permission((select auth.uid()),'team_auction','manage','team',p_team_id) then raise exception 'PERMISSION_DENIED';end if;
 return public.update_auction_lifecycle(p_team_id,p_expected_status,p_new_status);
end;$$;
grant execute on function public.rbac_update_auction_lifecycle(uuid,text,text) to authenticated;

revoke execute on function public.place_tournament_bid(uuid,uuid,numeric) from authenticated;
create or replace function public.rbac_place_tournament_bid(p_auction_id uuid,p_team_id uuid,p_amount numeric)
returns public.auction_bids language plpgsql security definer set search_path='' as $$begin
 if not private.has_permission((select auth.uid()),'team_auction','bid','team',p_team_id) then raise exception 'PERMISSION_DENIED';end if;
 return public.place_tournament_bid(p_auction_id,p_team_id,p_amount);
end;$$;
grant execute on function public.rbac_place_tournament_bid(uuid,uuid,numeric) to authenticated;

create or replace function public.phase17_setup_status() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object(
 'modules',to_regclass('public.app_modules') is not null,'actions',to_regclass('public.permission_actions') is not null,'module_actions',to_regclass('public.module_permission_actions') is not null,'role_permissions',to_regclass('public.role_permissions') is not null,
 'user_overrides',to_regclass('public.user_permission_overrides') is not null,'audit',to_regclass('public.permission_audit_log') is not null,
 'resolver',to_regprocedure('public.current_user_has_permission(text,text,text,uuid)') is not null,'matrix',to_regprocedure('public.get_role_permission_matrix(text,text,uuid)') is not null);
$$;revoke all on function public.phase17_setup_status() from public;grant execute on function public.phase17_setup_status() to authenticated;
