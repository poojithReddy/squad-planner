import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync}from"node:fs";
import{permissionGranted,teamModuleRegistry}from"../src/lib/permissions/registry.ts";

test("team module registry uses stable unique permission keys",()=>{const keys=teamModuleRegistry.map(item=>item.key);assert.equal(new Set(keys).size,keys.length);assert.ok(keys.includes("team_planning"));assert.ok(keys.includes("team_reports"))});
test("missing permissions deny by default",()=>{assert.equal(permissionGranted({},"team_players","view"),false);assert.equal(permissionGranted({team_players:{view:true}},"team_players","view"),true);assert.equal(permissionGranted({team_players:{view:true}},"team_players","delete"),false)});
test("migration contains scoped overrides, deny precedence, audit and restrictive player policies",()=>{const sql=readFileSync("supabase/migrations/012_module_rbac.sql","utf8");for(const value of["create table public.app_modules","create table public.role_permissions","create table public.user_permission_overrides","effect='deny'","effect='allow'","permission_audit_log","current_user_has_permission","RBAC players delete","phase17_setup_status"])assert.match(sql,new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"))});
test("an override cannot manufacture team membership",()=>{const sql=readFileSync("supabase/migrations/012_module_rbac.sql","utf8");assert.match(sql,/p_scope_type='team'[\s\S]*not exists\(select 1 from public\.team_members[\s\S]*return false/i)});
