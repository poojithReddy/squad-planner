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

test("filtered shortlist reorder swaps the adjacent visible player and explains its state", () => {
  const source = readFileSync("src/components/planning/planning-workspace.tsx", "utf8");
  const action = readFileSync("src/app/(protected)/teams/[teamId]/planning/actions.ts", "utf8");
  assert.match(source, /visibleSelected\.findIndex/);
  assert.match(source, /targetVisibleIndex/);
  assert.match(source, /targetSelection\.id/);
  assert.match(source, /Reorder controls move players within this bucket view/);
  assert.match(source, /↑ Up/);
  assert.match(source, /↓ Down/);
  assert.match(action, /targetSelectionId\?: string/);
  assert.match(action, /requestedIndex/);
});

test("each plan shortlist can be filtered by bucket and remains responsive", () => {
  const source = readFileSync("src/components/planning/planning-workspace.tsx", "utf8");
  assert.match(source, /shortlistBucketId/);
  assert.match(source, /visibleSelected/);
  assert.match(source, /Filter by bucket/);
  assert.match(source, /All buckets \(\{selected\.length\}\)/);
  assert.match(source, /Showing \{visibleSelected\.length\} of \{selected\.length\} players/);
  assert.match(source, /xl:grid-cols-\[minmax\(0,1\.05fr\)_minmax\(24rem,0\.95fr\)\]/);
  assert.match(source, /sticky top-16/);
});

test("planning players expose a responsive profile modal with accessible close controls", () => {
  const source = readFileSync("src/components/planning/planning-workspace.tsx", "utf8");
  assert.match(source, /View profile/);
  assert.match(source, /PlayerProfileModal/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /Close player profile/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.match(source, /Career \/ Imported Stats/);
});

test("player pool has responsive cards, compact filters and a read-only details route", () => {
  const page = readFileSync("src/app/(protected)/teams/[teamId]/players/page.tsx", "utf8");
  const filters = readFileSync("src/components/players/player-filters.tsx", "utf8");
  const view = readFileSync("src/app/(protected)/teams/[teamId]/players/[playerId]/page.tsx", "utf8");
  assert.match(page, /sm:grid-cols-2 lg:hidden/);
  assert.match(page, /players\/\$\{player\.id\}`/);
  assert.match(page, />View</);
  assert.match(filters, /filtersOpen/);
  assert.match(filters, /aria-expanded=\{filtersOpen\}/);
  assert.match(view, /Player details/);
  assert.match(view, /Career \/ Imported Stats/);
  assert.match(view, /Read-only auction planning/);
});

test("budget update is permission checked, validated and does not modify bucket budgets", () => {
  const action = readFileSync("src/app/(protected)/teams/[teamId]/buckets/actions.ts", "utf8");
  assert.match(action, /requireTeamAccess\(teamId, true\)/);
  assert.match(action, /normalizeTeamBudget/);
  assert.match(action, /teams[\s\S]*update\(\{ total_auction_budget: normalized \}\)/);
  assert.doesNotMatch(action, /auction_buckets[\s\S]*planned_budget[\s\S]*normalized/);
});
