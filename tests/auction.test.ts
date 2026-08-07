import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { auctionTotals, bucketProgress, filterPlayersByPlan, planAuctionProgress, planLabelsForPlayer, rankRecommendations } from "../src/lib/auction/calculations.ts";
import type { AuctionSnapshot } from "../src/types/auction.ts";

const now = new Date().toISOString();
function snapshot(): AuctionSnapshot {
  return {
    team: { id:"team",name:"Test",squad_size:2,total_auction_budget:100,primary_colour:null,logoSignedUrl:null,auction_status:"live" }, canEdit:true,canControlLifecycle:true,history:[],
    buckets:[{id:"bucket",team_id:"team",name:"All-rounders",description:null,minimum_players:1,maximum_players:2,planned_budget:60,display_order:0,created_at:now,updated_at:now}],
    players:[
      {id:"won",team_id:"team",bucket_id:"bucket",bucketName:"All-rounders",name:"Won Player",role:"All-rounder",priority:2,expected_price:40,availability_status:"full",available_matches:null,availability_notes:null,notes:null,auction_status:"my_team",sold_price:0,matches:0,batting_score:0,bowling_wickets:0,catches:0,created_at:now,updated_at:now},
      {id:"plan-a",team_id:"team",bucket_id:"bucket",bucketName:"All-rounders",name:"Plan A Target",role:"All-rounder",priority:1,expected_price:50,availability_status:"full",available_matches:null,availability_notes:null,notes:null,auction_status:"available",sold_price:0,matches:0,batting_score:0,bowling_wickets:0,catches:0,created_at:now,updated_at:now},
      {id:"backup",team_id:"team",bucket_id:null,bucketName:null,name:"Backup",role:"Batter",priority:4,expected_price:150,availability_status:"partial",available_matches:3,availability_notes:null,notes:null,auction_status:"available",sold_price:0,matches:0,batting_score:0,bowling_wickets:0,catches:0,created_at:now,updated_at:now},
      {id:"lost",team_id:"team",bucket_id:null,bucketName:null,name:"Lost",role:"Bowler",priority:1,expected_price:1,availability_status:"full",available_matches:null,availability_notes:null,notes:null,auction_status:"other_team",sold_price:0,matches:0,batting_score:0,bowling_wickets:0,catches:0,created_at:now,updated_at:now},
    ],
    plans:[{id:"plan",team_id:"team",plan_label:"A",created_at:now,updated_at:now}],
    selections:[{id:"selection",team_id:"team",probable_team_id:"plan",player_id:"plan-a",display_order:0,created_at:now,updated_at:now}],
  };
}

test("sold price zero is valid in squad, spend and bucket counts",()=>{const data=snapshot();const totals=auctionTotals(data);assert.equal(totals.squad.length,1);assert.equal(totals.spent,0);assert.equal(totals.remaining,100);const bucket=bucketProgress(data)[0];assert.equal(bucket.count,1);assert.equal(bucket.spent,0);});
test("other-team players are excluded from squad and recommendations",()=>{const data=snapshot();assert.equal(auctionTotals(data).squad.some(player=>player.id==="lost"),false);assert.equal(rankRecommendations(data).some(item=>item.player.id==="lost"),false);});
test("Plan A, priority, availability and budget rank the expected target first",()=>{const ranked=rankRecommendations(snapshot());assert.equal(ranked[0].player.id,"plan-a");assert.equal(ranked[0].budgetRisk,false);assert.equal(ranked[1].budgetRisk,true);});
test("Migration enforces roles, row locking, expected status and atomic history",async()=>{const sql=await readFile(new URL("../supabase/migrations/003_live_auction.sql",import.meta.url),"utf8");assert.match(sql,/private\.has_team_role/);assert.match(sql,/for update/);assert.match(sql,/AUCTION_CONFLICT/);assert.match(sql,/insert into public\.auction_history/);assert.match(sql,/update_auction_lifecycle/);});
test("plan membership, filtering and secured/lost/available progress use current auction state",()=>{const data=snapshot();data.selections.push({id:"won-selection",team_id:"team",probable_team_id:"plan",player_id:"won",display_order:1,created_at:now,updated_at:now},{id:"lost-selection",team_id:"team",probable_team_id:"plan",player_id:"lost",display_order:2,created_at:now,updated_at:now});assert.deepEqual(planLabelsForPlayer(data,"won"),["A"]);assert.deepEqual(filterPlayersByPlan(data,data.players,"A").map(player=>player.id),["won","plan-a","lost"]);assert.deepEqual(planAuctionProgress(data,"A"),{players:[data.players[1],data.players[0],data.players[3]],secured:1,lost:1,available:1});});
test("undoing any earlier pick restores squad, budget, bucket and plan status",()=>{const data=snapshot();data.players[0].sold_price=70;data.selections.push({id:"won-selection",team_id:"team",probable_team_id:"plan",player_id:"won",display_order:1,created_at:now,updated_at:now});assert.equal(auctionTotals(data).spent,70);assert.equal(planAuctionProgress(data,"A").secured,1);data.players[0]={...data.players[0],auction_status:"available",sold_price:0};assert.equal(auctionTotals(data).spent,0);assert.equal(auctionTotals(data).squad.length,0);assert.equal(bucketProgress(data)[0].spent,0);assert.equal(planAuctionProgress(data,"A").available,2);});
test("auction and squad UIs expose prior-pick undo, completed guard and realtime refresh",()=>{const auction=readFileSync("src/components/auction/live-auction.tsx","utf8"),squad=readFileSync("src/components/auction/squad-actions.tsx","utf8"),action=readFileSync("src/app/(protected)/teams/[teamId]/auction/actions.ts","utf8");assert.match(auction,/Undo Pick/);assert.match(auction,/Pre-auction plans/);assert.match(auction,/Not in a Plan/);assert.match(auction,/setTab\("auction"\)/);assert.match(squad,/postgres_changes/);assert.match(squad,/"my_team","available",0/);assert.match(action,/auction_status.*completed/);assert.match(action,/update_player_auction_status/);});
