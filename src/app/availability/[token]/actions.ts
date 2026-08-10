"use server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
export async function loadPlayerAvailability(token:string,playerId:string){const s=await createClient();const{data,error}=await s.rpc("get_public_player_availability",{p_token:token,p_player_id:playerId});return{ok:!error,rows:(data??[]) as Json}}
export async function submitAvailability(token:string,playerId:string,responses:{match_id:string;availability_status:"available"|"unavailable"|"maybe";notes:string}[]){const s=await createClient();const{data,error}=await s.rpc("submit_player_availability",{p_token:token,p_player_id:playerId,p_responses:responses});return{ok:!error,count:data??0,message:error?"We couldn't save your availability. Check that the link is still active.":"Thanks — your availability has been saved."}}
