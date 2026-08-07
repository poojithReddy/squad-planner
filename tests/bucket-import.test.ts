import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { detectBucketImportColumns, matrixToBucketRows, normalizeAvailability, normalizeStatistic } from "../src/lib/import/bucket-player.ts";

test("case-insensitive aliases find required headers in any order", () => {
  const result = detectBucketImportColumns([" RUNS ", "PLAYER ROLE", "player name", "Matches Played", "Wickets", "Catch"]);
  assert.deepEqual(result.missing, []);
  assert.equal(result.mapping.name, 2);
  assert.equal(result.mapping.role, 1);
  assert.equal(result.mapping.battingScore, 0);
});

test("missing Name and Player Role headers are reported", () => {
  assert.deepEqual(detectBucketImportColumns(["Matches"]).missing, ["Name", "Player Role"]);
});

test("statistics clean blanks, nulls, negative, malformed, numeric strings and decimals", () => {
  for (const value of ["", null, undefined, -5, "abc", "eight"]) assert.equal(normalizeStatistic(value), 0);
  assert.equal(normalizeStatistic(0), 0);
  assert.equal(normalizeStatistic(" 8 "), 8);
  assert.equal(normalizeStatistic("12"), 12);
  assert.equal(normalizeStatistic(12.7), 12);
});

test("all four imported statistic fields default independently", () => {
  const { mapping } = detectBucketImportColumns(["Name", "Player Role", "Matches", "Batting Score", "Bowling Wickets", "Catches"]);
  const [row] = matrixToBucketRows([["Player", "Batter", "", -2, "bad", null]], mapping);
  assert.deepEqual([row.matches, row.battingScore, row.bowlingWickets, row.catches].map(normalizeStatistic), [0, 0, 0, 0]);
});

test("availability normalizes known values and defaults unknown", () => {
  assert.equal(normalizeAvailability("FULL"), "full");
  assert.equal(normalizeAvailability("Partially Available"), "partial");
  assert.equal(normalizeAvailability(""), "unknown");
  assert.equal(normalizeAvailability("sometimes"), "unknown");
});

test("migration protects statistics, team bucket references, permissions and history", () => {
  const sql = readFileSync("supabase/migrations/007_bucket_player_stats_import.sql", "utf8");
  assert.match(sql, /matches >= 0/);
  assert.match(sql, /player_import_history_bucket_fkey/);
  assert.match(sql, /owner','captain','vice_captain','manager/);
  assert.match(sql, /imported_by = \(select auth\.uid\(\)\)/);
});

test("server import enforces URL bucket and limits duplicate updates", () => {
  const action = readFileSync("src/app/(protected)/teams/[teamId]/buckets/[bucketId]/import/actions.ts", "utf8");
  assert.match(action, /eq\("team_id", teamId\)/);
  assert.match(action, /bucket_id: bucketId/);
  assert.doesNotMatch(action, /auction_status:|sold_price:|priority:|expected_price:|notes:/);
  assert.match(action, /decision === "skip"/);
  assert.match(action, /decision === "update"/);
});
