"use server";
import { revalidatePath } from "next/cache";
import { requireTeamAccess } from "@/lib/planning/access";
import { createClient } from "@/lib/supabase/server";
import type { AuctionLifecycle, AuctionStatus } from "@/types/database";
import type { AuctionMutationResult } from "@/types/auction";

export async function changeAuctionStatus(teamId:string,playerId:string,expectedStatus:AuctionStatus,newStatus:AuctionStatus,soldPrice=0,overrideSquad=false,overrideBucket=false):Promise<AuctionMutationResult>{
  await requireTeamAccess(teamId,true); if(!Number.isFinite(soldPrice)||soldPrice<0)return{ok:false,code:"error",message:"Sold price must be 0 or greater."};
  const supabase=await createClient(); const{data,error}=await supabase.rpc("update_player_auction_status",{p_team_id:teamId,p_player_id:playerId,p_expected_status:expectedStatus,p_new_status:newStatus,p_sold_price:soldPrice,p_override_squad_limit:overrideSquad,p_override_bucket_max:overrideBucket});
  if(error){const message=error.message;if(message.includes("AUCTION_CONFLICT"))return{ok:false,code:"conflict",message:"This player's auction status changed on another device. The latest status has been loaded."};if(message.includes("SQUAD_LIMIT"))return{ok:false,code:"squad_limit",message:"The squad limit has been reached. Confirm again to continue."};if(message.includes("BUCKET_MAX"))return{ok:false,code:"bucket_max",message:"This bucket is at its planned maximum. Confirm again to continue."};if(message.includes("READ_ONLY"))return{ok:false,code:"forbidden",message:"You have read-only auction access."};return{ok:false,code:"error",message:"The auction decision could not be saved."}}
  revalidatePath(`/teams/${teamId}/auction`);revalidatePath(`/teams/${teamId}/squad`);return{ok:true,player:data};
}
export async function changeAuctionLifecycle(teamId:string,expected:AuctionLifecycle,next:AuctionLifecycle){await requireTeamAccess(teamId);const supabase=await createClient();const{data,error}=await supabase.rpc("update_auction_lifecycle",{p_team_id:teamId,p_expected_status:expected,p_new_status:next});if(error)return{ok:false,message:error.message.includes("CONFLICT")?"Auction lifecycle changed on another device.":"Unable to update the auction lifecycle."};revalidatePath(`/teams/${teamId}/auction`);revalidatePath(`/teams/${teamId}/squad`);return{ok:true,status:data};}
