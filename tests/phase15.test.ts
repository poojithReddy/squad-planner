import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const migration=readFileSync("supabase/migrations/010_super_admin_multi_tournament.sql","utf8");
const access=readFileSync("src/lib/platform/admin-access.ts","utf8");
const actions=readFileSync("src/app/(protected)/admin/actions.ts","utf8");
const shell=readFileSync("src/components/layout/dashboard-shell.tsx","utf8");

test("migration creates a separate platform super admin role",()=>{
  assert.match(migration,/create table public\.platform_roles/i);
  assert.match(migration,/role in \('super_admin'\)/i);
  assert.match(migration,/unique\(user_id,role\)/i);
  assert.match(migration,/private\.is_super_admin\(\)[\s\S]*security definer set search_path=''/i);
});

test("multiple tournaments use explicit lifecycle and assignments",()=>{
  assert.match(migration,/add column status text not null default 'draft'/i);
  assert.match(migration,/draft','setup','active','completed','archived/i);
  assert.match(migration,/super_admin_create_tournament/);
  assert.match(migration,/super_admin_assign_tournament_role/);
  assert.match(migration,/on conflict\(tournament_id,user_id\)/i);
});

test("super admin policies do not expose private team strategy",()=>{
  assert.doesNotMatch(migration,/create policy[^;]+on public\.players/i);
  assert.doesNotMatch(migration,/create policy[^;]+on public\.probable_teams/i);
  assert.doesNotMatch(migration,/create policy[^;]+on public\.probable_team_players/i);
  assert.doesNotMatch(migration,/create policy[^;]+on public\.auction_buckets/i);
  assert.match(migration,/private_team_strategy_unchanged',true/i);
});

test("tournament invitations assign existing accounts and claim invited accounts",()=>{
  assert.match(migration,/create table public\.tournament_invitations/i);
  assert.match(migration,/from auth\.users where lower\(email\)=v_email/i);
  assert.match(migration,/claim_tournament_invitations/i);
  assert.match(actions,/inviteUserByEmail/);
  assert.match(actions,/SUPABASE_SERVICE_ROLE_KEY/);
});

test("admin routes and role-aware navigation are protected",()=>{
  assert.match(access,/requireSuperAdmin/);
  assert.match(access,/notFound/);
  assert.match(shell,/isSuperAdmin/);
  for(const path of ["src/app/(protected)/admin/page.tsx","src/app/(protected)/admin/tournaments/page.tsx","src/app/(protected)/admin/users/page.tsx"])assert.doesNotThrow(()=>readFileSync(path,"utf8"));
});

test("applied migration 009 remains unchanged and Phase 15 uses migration 010",()=>{
  assert.doesNotThrow(()=>readFileSync("supabase/migrations/009_tournament_admin_access.sql","utf8"));
  assert.match(migration,/Apply manually after 009_tournament_admin_access\.sql/i);
  assert.match(migration,/phase15_setup_status/);
});
