import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";
const sql=await readFile(new URL("../supabase/migrations/004_tournament_matches.sql",import.meta.url),"utf8");
test("tournament and fixture validation exists",()=>{assert.match(sql,/tournaments_dates_check/);assert.match(sql,/default_match_squad_size>0/);assert.match(sql,/opponent_name text not null/);assert.match(sql,/result in\('scheduled','won','lost','draw','no_result','cancelled'\)/)});
test("duplicate match players and multiple captains are prevented",()=>{assert.match(sql,/unique\(match_id,player_id\)/);assert.match(sql,/match_players_one_captain_idx/);assert.match(sql,/where is_match_captain/)});
test("cross-team and final squad protections exist",()=>{assert.match(sql,/match_players_match_same_team_fkey/);assert.match(sql,/match_players_player_same_team_fkey/);assert.match(sql,/PLAYER_NOT_IN_TEAM_SQUAD/);assert.match(sql,/auction_status='my_team'/)});
test("manager permissions and result fields exist",()=>{assert.match(sql,/private\.has_team_role/);assert.match(sql,/team_score text/);assert.match(sql,/opponent_score text/);assert.match(sql,/result_notes text/)});
