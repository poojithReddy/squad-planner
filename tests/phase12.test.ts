import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateBudgetPosition, normalizeTeamBudget } from "../src/lib/planning/budget.ts";

test("team budget accepts zero and positive values while rejecting invalid input", () => {
  assert.equal(normalizeTeamBudget(0), 0);
  assert.equal(normalizeTeamBudget("6000"), 6000);
  assert.equal(normalizeTeamBudget(12.345), 12.35);
  assert.equal(normalizeTeamBudget(-1), null);
  assert.equal(normalizeTeamBudget("not-a-number"), null);
});

test("budget position recalculates unallocated and over-planned values", () => {
  assert.deepEqual(calculateBudgetPosition(5000, 1000), { difference: 4000, unallocated: 4000, overPlanned: 0 });
  assert.deepEqual(calculateBudgetPosition(1000, 1500), { difference: -500, unallocated: 0, overPlanned: 500 });
});

test("planning mutations optimistically update and guard duplicate clicks", () => {
  const source = readFileSync("src/components/planning/planning-workspace.tsx", "utf8");
  assert.match(source, /if \(pendingKeys\.has\(key\)\) return/);
  assert.match(source, /setSelections\(current => \[\.\.\.current, optimistic\]\)/);
  assert.match(source, /current\.filter\(item => item\.id !== optimisticId\)/);
  assert.match(source, /Adding\.\.\./);
  assert.match(source, /✓ In Plan/);
  assert.match(source, /setSelections\(previous\)/);
});

test("planning counts, estimates, remove and reorder derive from optimistic state", () => {
  const source = readFileSync("src/components/planning/planning-workspace.tsx", "utf8");
  assert.match(source, /selectedByPlan/);
  assert.match(source, /estimates\[activePlan\]/);
  assert.match(source, /removeFromPlan/);
  assert.match(source, /movePlanPlayer/);
  assert.match(source, /\[reordered\[index\], reordered\[target\]\]/);
});

test("budget update is permission checked, validated and does not modify bucket budgets", () => {
  const action = readFileSync("src/app/(protected)/teams/[teamId]/buckets/actions.ts", "utf8");
  assert.match(action, /requireTeamAccess\(teamId, true\)/);
  assert.match(action, /normalizeTeamBudget/);
  assert.match(action, /teams[\s\S]*update\(\{ total_auction_budget: normalized \}\)/);
  assert.doesNotMatch(action, /auction_buckets[\s\S]*planned_budget[\s\S]*normalized/);
});
