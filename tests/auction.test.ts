import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { auctionTotals, bucketProgress, rankRecommendations } from "../src/lib/auction/calculations.ts";
import type { AuctionSnapshot } from "../src/types/auction.ts";

const now = new Date().toISOString();
function snapshot(): AuctionSnapshot {
  return {
    team: { id:"team",name:"Test",squad_size:2,total_auction_budget:100,primary_colour:null,logoSignedUrl:null,auction_status:"live" }, canEdit:true,canControlLifecycle:true,history:[],
    buckets:[{id:"bucket",team_id:"team",name:"All-rounders",description:null,minimum_players:1,maximum_players:2,planned_budget:60,display_order:0,created_at:now,updated_at:now}],
    players:[
      {id:"won",team_id:"team",bucket_id:"bucket",bucketName:"All-rounders",name:"Won Player",role:"All-rounder",priority:2,expected_price:40,availability_status:"full",available_matches:null,availability_notes:null,notes:null,auction_status:"my_team",sold_price:0,created_at:now,updated_at:now},
      {id:"plan-a",team_id:"team",bucket_id:"bucket",bucketName:"All-rounders",name:"Plan A Target",role:"All-rounder",priority:1,expected_price:50,availability_status:"full",available_matches:null,availability_notes:null,notes:null,auction_status:"available",sold_price:0,created_at:now,updated_at:now},
      {id:"backup",team_id:"team",bucket_id:null,bucketName:null,name:"Backup",role:"Batter",priority:4,expected_price:150,availability_status:"partial",available_matches:3,availability_notes:null,notes:null,auction_status:"available",sold_price:0,created_at:now,updated_at:now},
      {id:"lost",team_id:"team",bucket_id:null,bucketName:null,name:"Lost",role:"Bowler",priority:1,expected_price:1,availability_status:"full",available_matches:null,availability_notes:null,notes:null,auction_status:"other_team",sold_price:0,created_at:now,updated_at:now},
    ],
    plans:[{id:"plan",team_id:"team",plan_label:"A",created_at:now,updated_at:now}],
    selections:[{id:"selection",team_id:"team",probable_team_id:"plan",player_id:"plan-a",display_order:0,created_at:now,updated_at:now}],
  };
}

test("sold price zero is valid in squad, spend and bucket counts",()=>{const data=snapshot();const totals=auctionTotals(data);assert.equal(totals.squad.length,1);assert.equal(totals.spent,0);assert.equal(totals.remaining,100);const bucket=bucketProgress(data)[0];assert.equal(bucket.count,1);assert.equal(bucket.spent,0);});
test("other-team players are excluded from squad and recommendations",()=>{const data=snapshot();assert.equal(auctionTotals(data).squad.some(player=>player.id==="lost"),false);assert.equal(rankRecommendations(data).some(item=>item.player.id==="lost"),false);});
test("Plan A, priority, availability and budget rank the expected target first",()=>{const ranked=rankRecommendations(snapshot());assert.equal(ranked[0].player.id,"plan-a");assert.equal(ranked[0].budgetRisk,false);assert.equal(ranked[1].budgetRisk,true);});
test("Migration enforces roles, row locking, expected status and atomic history",async()=>{const sql=await readFile(new URL("../supabase/migrations/003_live_auction.sql",import.meta.url),"utf8");assert.match(sql,/private\.has_team_role/);assert.match(sql,/for update/);assert.match(sql,/AUCTION_CONFLICT/);assert.match(sql,/insert into public\.auction_history/);assert.match(sql,/update_auction_lifecycle/);});
