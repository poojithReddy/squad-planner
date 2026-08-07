import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateTeamDashboard } from "../src/lib/dashboard/calculations.ts";
import { buildTeamImagePath, validateTeamImage } from "../src/lib/storage/team-images.ts";
import type { Database } from "../src/types/database.ts";

type Team=Database["public"]["Tables"]["teams"]["Row"];
type Player=Database["public"]["Tables"]["players"]["Row"];
type Match=Database["public"]["Tables"]["matches"]["Row"];
type MatchPlayer=Database["public"]["Tables"]["match_players"]["Row"];
type Duty=Database["public"]["Tables"]["volunteer_duties"]["Row"];
type Assignment=Database["public"]["Tables"]["volunteer_duty_assignments"]["Row"];

const team={id:"team-1",name:"Thunder Knights",primary_colour:"#16734b",secondary_colour:null,captain_name:"Poojith",vice_captain_name:"Uday",manager_name:null,squad_size:4,total_auction_budget:1000,logo_url:null,banner_url:null,auction_status:"live",created_by:"user-1",created_at:"2026-01-01",updated_at:"2026-01-01"} satisfies Team;
const player=(id:string,status:"available"|"my_team"="my_team",price=0)=>({id,team_id:"team-1",bucket_id:null,name:`Player ${id}`,role:"Batter",priority:null,expected_price:0,availability_status:"full",available_matches:null,availability_notes:null,notes:null,auction_status:status,sold_price:price,matches:0,batting_score:0,bowling_wickets:0,catches:0,created_at:"2026-01-01",updated_at:"2026-01-01"}) satisfies Player;
const match=(id:string,date:string,result:Match["result"])=>({id,tournament_id:"t-1",team_id:"team-1",opponent_name:`Opponent ${id}`,match_date:date,match_time:"10:00:00",venue:"Ground 1",round_name:null,match_number:null,squad_size:11,result,team_score:null,opponent_score:null,result_notes:null,notes:null,created_at:"2026-01-01",updated_at:"2026-01-01"}) satisfies Match;

test("team image validation enforces type and per-kind limits",()=>{
  assert.equal(validateTeamImage("logo",{type:"image/png",size:2*1024*1024}),null);
  assert.match(validateTeamImage("logo",{type:"image/png",size:2*1024*1024+1})??"",/2 MB/);
  assert.equal(validateTeamImage("banner",{type:"image/webp",size:5*1024*1024}),null);
  assert.match(validateTeamImage("banner",{type:"image/jpeg",size:5*1024*1024+1})??"",/5 MB/);
  assert.match(validateTeamImage("logo",{type:"image/gif",size:100})??"",/PNG, JPEG or WEBP/);
  assert.match(validateTeamImage("banner",{type:"application/pdf",size:100})??"",/PNG, JPEG or WEBP/);
});

test("logo and banner paths are unique, safe and team scoped",()=>{
  assert.equal(buildTeamImagePath("team-1","logo","image/png",100,"abc_unsafe"),"teams/team-1/logo/logo-100-abcunsafe.png");
  assert.equal(buildTeamImagePath("team-1","banner","image/webp",101,"xyz"),"teams/team-1/banner/banner-101-xyz.webp");
});

test("branding action preserves old asset until replacement succeeds and keeps owner/captain permissions",()=>{
  const action=readFileSync("src/app/(protected)/teams/[teamId]/assets/actions.ts","utf8");
  const form=readFileSync("src/components/teams/team-asset-form.tsx","utf8");
  const config=readFileSync("next.config.ts","utf8");
  assert.match(config,/bodySizeLimit:\s*"6mb"/);
  assert.match(action,/"owner", "captain"/);
  assert.match(form,/upsert:false/);
  assert.match(form,/createClient\(\)/);
  assert.match(action,/prepareTeamAssetUpload/);
  assert.match(action,/completeTeamAssetUpload/);
  assert.ok(action.indexOf("update(update)")<action.indexOf("remove([oldPath])"));
  assert.match(form,/couldn't upload/);
  assert.doesNotMatch(form,/message:uploadError\.message/);
});

test("dashboard calculates squad, budget, results, opportunity, fixture and duty metrics",()=>{
  const players=[player("1","my_team",100),player("2","my_team",0),player("3","my_team",250),player("4","available",0)];
  const matches=[match("past-win","2026-08-01","won"),match("past-loss","2026-08-02","lost"),match("draw","2026-08-03","draw"),match("nr","2026-08-04","no_result"),match("next","2026-08-12","scheduled"),match("later","2026-08-14","scheduled")];
  const matchPlayers=[{id:"mp-1",match_id:"past-win",player_id:"1",team_id:"team-1",selected:true,playing_status:"playing",availability_override:"available",batting_order:null,bowling_order:null,is_match_captain:false,is_wicketkeeper:false,notes:null,created_at:"2026-01-01",updated_at:"2026-01-01"}] satisfies MatchPlayer[];
  const duties=[{id:"d1",team_id:"team-1",match_id:null,duty_date:"2026-08-11",duty_time:"09:00",duty_type:"Scorer",description:null,required_people:2,status:"open",created_at:"2026-01-01",updated_at:"2026-01-01"},{id:"d2",team_id:"team-1",match_id:null,duty_date:"2026-08-11",duty_time:"10:00",duty_type:"Umpire",description:null,required_people:1,status:"cancelled",created_at:"2026-01-01",updated_at:"2026-01-01"}] satisfies Duty[];
  const assignments=[{id:"a1",duty_id:"d1",team_id:"team-1",player_id:"2",notes:null,completed:false,created_at:"2026-01-01",updated_at:"2026-01-01"}] satisfies Assignment[];
  const result=calculateTeamDashboard(team,players,matches,matchPlayers,duties,assignments,"2026-08-08");
  assert.deepEqual({squad:result.squadCount,target:result.squadTarget,slots:result.slotsRemaining,spent:result.totalSpent,remaining:result.remainingBudget},{squad:3,target:4,slots:1,spent:350,remaining:650});
  assert.deepEqual({played:result.matchesPlayed,wins:result.wins,losses:result.losses,draws:result.draws,noResults:result.noResults},{played:4,wins:1,losses:1,draws:1,noResults:1});
  assert.equal(result.playersUsed,1);assert.equal(result.playersYetToPlay,2);assert.equal(result.nextFixture?.id,"next");assert.equal(result.upcomingDuties,1);assert.equal(result.openDutyPositions,1);
});

test("dashboard loader scopes every table query to the requested team",()=>{
  const loader=readFileSync("src/lib/dashboard/queries.ts","utf8");
  for(const table of ["players","matches","match_players","volunteer_duties","volunteer_duty_assignments","tournaments"])assert.match(loader,new RegExp(`from\\(\\"${table}\\"\\)[\\s\\S]*?eq\\(\\"team_id\\",teamId\\)`));
});
