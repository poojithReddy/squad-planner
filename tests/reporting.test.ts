import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { opportunities, rankVolunteers } from "../src/lib/reporting/calculations.ts";

const now = new Date().toISOString();
const player = (id: string, name: string) => ({ id, team_id: "t", bucket_id: null, name, role: null, priority: null, expected_price: 0, availability_status: "full" as const, available_matches: null, availability_notes: null, notes: null, auction_status: "my_team" as const, sold_price: 0, matches: 0, batting_score: 0, bowling_wickets: 0, catches: 0, created_at: now, updated_at: now });

test("zero appearance and opportunity percentages", () => { const result = opportunities([player("a", "A")], ["m1"], [])[0]; assert.equal(result.played, 0); assert.equal(result.notSelected, 1); assert.equal(result.playingPct, 0); assert.equal(result.label, "No Appearance Yet"); });
test("volunteer ranking prefers the lowest duty count", () => { const players = [player("a", "A"), player("b", "B")]; const assignments = [{ id: "x", duty_id: "d", team_id: "t", player_id: "a", notes: null, completed: false, created_at: now, updated_at: now }]; assert.equal(rankVolunteers(players, assignments, new Set(), new Set(), new Set())[0].player.id, "b"); });
test("migration prevents duplicates, cross-team references and detects conflicts", async () => { const sql = await readFile(new URL("../supabase/migrations/005_duties_reporting.sql", import.meta.url), "utf8"); assert.match(sql, /unique\(duty_id,player_id\)/); assert.match(sql, /duty_same_team_fkey/); assert.match(sql, /player_same_team_fkey/); assert.match(sql, /SAME_TIME_DUTY/); assert.match(sql, /private\.has_team_role/); });
