import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { isNavigationActive } from "../src/lib/navigation/active.ts";

const navigationSource=readFileSync("src/components/layout/authenticated-navigation.tsx","utf8");
const registrySource=readFileSync("src/lib/permissions/registry.ts","utf8");
const shellSource=readFileSync("src/components/layout/dashboard-shell.tsx","utf8");

test("desktop sidebar defaults collapsed and has accessible expand and collapse controls",()=>{
  assert.match(shellSource,/useState\(false\)/);
  assert.match(shellSource,/Expand navigation/);
  assert.match(shellSource,/Collapse navigation/);
  assert.match(shellSource,/xl:grid-cols-\[5rem_1fr\]/);
  assert.match(shellSource,/xl:grid-cols-\[17rem_1fr\]/);
});

test("workspace navigation contains every primary module",()=>{
  for(const label of ["Dashboard","Players","Buckets","Planning","Auction","Squad","Tournament","Opportunities","Volunteer Duties","Reports"]){
    assert.match(registrySource,new RegExp(`label\\s*:\\s*\"${label}\"`));
  }
  assert.match(navigationSource,/title=\{collapsed\?link\.label/);
  assert.match(navigationSource,/aria-current=\{active\?"page"/);
});

test("dashboard active state is exact while nested modules remain active",()=>{
  assert.equal(isNavigationActive("/teams/team-1","/teams/team-1",{exact:true}),true);
  assert.equal(isNavigationActive("/teams/team-1/auction","/teams/team-1",{exact:true}),false);
  assert.equal(isNavigationActive("/teams/team-1/tournament/matches/match-1","/teams/team-1/tournament"),true);
  assert.equal(isNavigationActive("/teams/team-1/reports","/teams/team-1/auction"),false);
});

test("tablet and mobile drawer supports dismissal, focus management and route close",()=>{
  assert.match(navigationSource,/xl:hidden/);
  assert.match(navigationSource,/role="dialog"/);
  assert.match(navigationSource,/aria-modal="true"/);
  assert.match(navigationSource,/event\.key==="Escape"/);
  assert.match(navigationSource,/event\.key!=="Tab"/);
  assert.match(navigationSource,/onNavigate=\{\(\)=>setOpen\(false\)\}/);
  assert.match(navigationSource,/onClick=\{\(\)=>setOpen\(false\)\}/);
});

test("all major authenticated page routes exist",()=>{
  const routes=[
    "src/app/(protected)/dashboard/page.tsx",
    "src/app/(protected)/profile/page.tsx",
    "src/app/(protected)/teams/[teamId]/page.tsx",
    "src/app/(protected)/teams/[teamId]/players/page.tsx",
    "src/app/(protected)/teams/[teamId]/buckets/page.tsx",
    "src/app/(protected)/teams/[teamId]/planning/page.tsx",
    "src/app/(protected)/teams/[teamId]/auction/page.tsx",
    "src/app/(protected)/teams/[teamId]/squad/page.tsx",
    "src/app/(protected)/teams/[teamId]/tournament/page.tsx",
    "src/app/(protected)/teams/[teamId]/opportunities/page.tsx",
    "src/app/(protected)/teams/[teamId]/duties/page.tsx",
    "src/app/(protected)/teams/[teamId]/reports/page.tsx",
  ];
  for(const route of routes)assert.equal(existsSync(route),true,`${route} must exist`);
});

test("duplicate horizontal team navigation was removed",()=>{
  const teamNav=readFileSync("src/components/teams/team-nav.tsx","utf8");
  assert.match(teamNav,/Primary team navigation is provided by the authenticated sidebar/);
  assert.doesNotMatch(teamNav,/<nav/);
});
