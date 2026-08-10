import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const migration=readFileSync("supabase/migrations/009_tournament_admin_access.sql","utf8");
const adminActions=readFileSync("src/app/(protected)/tournaments/[tournamentId]/admin/actions.ts","utf8");
const playerActions=readFileSync("src/app/(protected)/teams/[teamId]/players/actions.ts","utf8");
const playerForm=readFileSync("src/components/players/player-form.tsx","utf8");
const teamQueries=readFileSync("src/lib/teams/queries.ts","utf8");

test("migration creates separate tournament roles and links teams to tournaments",()=>{
  assert.match(migration,/create table public\.tournament_members/i);
  assert.match(migration,/tournament_admin.*tournament_viewer/i);
  assert.match(migration,/unique\(tournament_id,user_id\)/i);
  assert.match(migration,/add column tournament_id uuid null references public\.tournaments/i);
});

test("tournament admin helpers avoid recursive RLS and private planning access",()=>{
  assert.match(migration,/private\.is_tournament_admin\(requested_tournament_id uuid\)[\s\S]*security definer set search_path=''/i);
  assert.match(migration,/No policy is\s*\n-- added to players, buckets, plans, auction history, or private planning data/i);
  assert.doesNotMatch(migration,/create policy[^;]+on public\.players/i);
  assert.doesNotMatch(migration,/create policy[^;]+on public\.probable_team/i);
});

test("captain and vice captain replacement is atomic and unique",()=>{
  assert.match(migration,/team_members_one_captain_idx[\s\S]*where role='captain'/i);
  assert.match(migration,/team_members_one_vice_captain_idx[\s\S]*where role='vice_captain'/i);
  assert.match(migration,/TEAM_LEADERSHIP_REPLACE_REQUIRED/);
  assert.match(migration,/update public\.team_members set role='member'/i);
});

test("admin can create teams without receiving private membership",()=>{
  assert.match(migration,/admin_create_tournament_team/);
  const createFunction=migration.slice(migration.indexOf("create or replace function public.admin_create_tournament_team"),migration.indexOf("create or replace function public.admin_assign_team_role"));
  assert.doesNotMatch(createFunction,/insert into public\.team_members/i);
  assert.match(createFunction,/tournament_id\)/i);
});

test("invitations assign existing users and claim new Supabase Auth users",()=>{
  assert.match(migration,/admin_invite_team_user/);
  assert.match(migration,/from auth\.users where lower\(email\)=v_email/i);
  assert.match(migration,/claim_team_invitations/);
  assert.match(adminActions,/inviteUserByEmail/);
  assert.match(adminActions,/SUPABASE_SERVICE_ROLE_KEY/);
});

test("team switcher queries explicit memberships instead of all admin-visible teams",()=>{
  assert.match(teamQueries,/from\("team_members"\)[\s\S]*eq\("user_id",user\.id\)/);
  assert.match(teamQueries,/\.in\("id",teamIds\)/);
});

test("captain player edit validates role, availability and imported statistics",()=>{
  assert.match(playerActions,/Player role is required/);
  assert.match(playerActions,/Player statistics must be whole numbers of 0 or greater/);
  for(const field of ["matches","battingScore","bowlingWickets","catches"])assert.match(playerForm,new RegExp(`name="${field}"`));
  assert.doesNotMatch(playerForm,/auction_status|sold_price/);
});

test("admin routes are protected and responsive pages exist",()=>{
  for(const path of ["src/app/(protected)/tournaments/[tournamentId]/admin/page.tsx","src/app/(protected)/tournaments/[tournamentId]/admin/teams/page.tsx","src/app/(protected)/tournaments/[tournamentId]/admin/users/page.tsx","src/app/(protected)/tournaments/[tournamentId]/admin/settings/page.tsx"])assert.doesNotThrow(()=>readFileSync(path,"utf8"));
  const layout=readFileSync("src/app/(protected)/tournaments/[tournamentId]/admin/layout.tsx","utf8");assert.match(layout,/requireTournamentAdmin/);assert.match(layout,/overflow-x-auto/);
});
