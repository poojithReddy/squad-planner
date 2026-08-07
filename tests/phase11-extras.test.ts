import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { filterPlanningPlayers } from "../src/lib/planning/search.ts";
import { createTeamTheme } from "../src/lib/theme/team-colour.ts";
import type { PlayerWithBucket } from "../src/lib/planning/queries.ts";

const base={team_id:"team",bucket_id:"bucket",role:"All-rounder",priority:2,expected_price:70,availability_status:"full" as const,available_matches:null,availability_notes:null,notes:null,auction_status:"available" as const,sold_price:0,matches:0,batting_score:0,bowling_wickets:0,catches:0,created_at:"2026-01-01",updated_at:"2026-01-01",auction_buckets:{name:"Premium"}};
const players=[{...base,id:"1",name:"Ravi Kumar"},{...base,id:"2",name:"Ravindra Patel",bucket_id:"other",role:"Batter",priority:1,availability_status:"partial" as const,auction_buckets:{name:"Batters"}},{...base,id:"3",name:"Suravi Rao",priority:4}] satisfies PlayerWithBucket[];

test("team themes derive contrast-safe foregrounds and distinct interaction colours",()=>{
  const cases=[["#123b7a","#ffffff"],["#f6dc45","#11211a"],["#dc2626","#ffffff"],["#16a34a","#11211a"],["#7e22ce","#ffffff"]] as const;
  for(const[colour,foreground]of cases){const theme=createTeamTheme(colour);assert.equal(theme.primary,colour);assert.equal(theme.foreground,foreground);assert.notEqual(theme.hover,theme.primary);assert.notEqual(theme.soft,theme.primary)}
});

test("planning search is partial, case-insensitive and combines filters",()=>{
  assert.deepEqual(filterPlanningPlayers(players,{query:"RAV",bucketId:"",role:"",priority:"",availability:""}).map(player=>player.id),["1","2","3"]);
  assert.deepEqual(filterPlanningPlayers(players,{query:"rav",bucketId:"bucket",role:"All-rounder",priority:"2",availability:"full"}).map(player=>player.id),["1"]);
});

test("planning picker adds to current plan and visibly prevents duplicates",()=>{
  const source=readFileSync("src/components/planning/player-plan-search.tsx","utf8");
  assert.match(source,/Already in Plan/);assert.match(source,/Add to Plan/);assert.match(source,/selectedIds/);assert.match(source,/ArrowDown/);assert.match(source,/role="listbox"/);
  const migration=readFileSync("supabase/migrations/002_players_buckets_planning.sql","utf8");
  assert.match(migration,/unique\s*\(probable_team_id,\s*player_id\)/i);
});

test("team theme is scoped to team routes while public defaults remain",()=>{
  const layout=readFileSync("src/app/(protected)/teams/[teamId]/layout.tsx","utf8"),theme=readFileSync("src/components/theme/team-theme.tsx","utf8"),css=readFileSync("src/app/globals.css","utf8");
  assert.match(layout,/TeamTheme/);assert.match(theme,/delete root\.dataset\.teamWorkspace/);assert.match(css,/--team-primary-foreground/);assert.match(css,/accent-color: var\(--team-primary\)/);
});
